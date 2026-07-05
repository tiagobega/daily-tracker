import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '#/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card';
import { Field, FieldLabel } from '#/components/ui/field';
import { Input } from '#/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#/components/ui/select';
import { Skeleton } from '#/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group';
import { profileQueryOptions } from '#/features/profile/queries';
import { updateProfileFn } from '#/features/profile/server';
import { getLocalTimezone } from '#/lib/date';
import { useInstallPrompt } from '#/lib/pwa/use-install-prompt';
import { signOutFn } from '#/lib/supabase/auth';

export const Route = createFileRoute('/_app/settings')({
	component: SettingsPage,
});

const TIMEZONES: string[] =
	typeof Intl.supportedValuesOf === 'function'
		? Intl.supportedValuesOf('timeZone')
		: ['America/Sao_Paulo', 'UTC'];

function SettingsPage() {
	const router = useRouter();
	const query = useQuery(profileQueryOptions());

	async function handleSignOut() {
		await signOutFn();
		await router.invalidate();
		router.navigate({ to: '/login' });
	}

	return (
		<main className="flex flex-1 flex-col gap-4 p-4 pb-24">
			<h1 className="font-bold text-xl">Ajustes</h1>

			{query.isLoading || !query.data ? (
				<Skeleton className="h-40 w-full rounded-lg" />
			) : (
				<ProfileCard
					initialName={query.data.name}
					initialTimezone={query.data.timezone}
				/>
			)}

			<AppearanceCard />
			<InstallCard />

			<Card>
				<CardHeader>
					<CardTitle>Conta</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<p className="text-muted-foreground text-sm">{query.data?.email}</p>
					<Button variant="outline" onClick={handleSignOut}>
						Sair
					</Button>
				</CardContent>
			</Card>
		</main>
	);
}

function ProfileCard({
	initialName,
	initialTimezone,
}: {
	initialName: string | null;
	initialTimezone: string | null;
}) {
	const qc = useQueryClient();
	const [name, setName] = useState(initialName ?? '');
	const [timezone, setTimezone] = useState(
		initialTimezone ?? getLocalTimezone(),
	);

	const save = useMutation({
		mutationFn: () =>
			updateProfileFn({ data: { name: name.trim() || null, timezone } }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['profile'] });
			toast.success('Perfil salvo.');
		},
		onError: (e) =>
			toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.'),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Perfil</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Field>
					<FieldLabel htmlFor="profile-name">Nome</FieldLabel>
					<Input
						id="profile-name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="profile-tz">Fuso horário</FieldLabel>
					<Select value={timezone} onValueChange={setTimezone}>
						<SelectTrigger id="profile-tz">
							<SelectValue />
						</SelectTrigger>
						<SelectContent className="max-h-72">
							{TIMEZONES.map((tz) => (
								<SelectItem key={tz} value={tz}>
									{tz}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-muted-foreground text-xs">
						Usado para definir o seu "dia".
					</p>
				</Field>
				<Button onClick={() => save.mutate()} disabled={save.isPending}>
					{save.isPending ? 'Salvando…' : 'Salvar'}
				</Button>
			</CardContent>
		</Card>
	);
}

function AppearanceCard() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Aparência</CardTitle>
			</CardHeader>
			<CardContent>
				{mounted ? (
					<ToggleGroup
						type="single"
						variant="outline"
						value={theme ?? 'system'}
						onValueChange={(v) => v && setTheme(v)}
						className="w-full"
					>
						<ToggleGroupItem value="system" className="flex-1">
							Sistema
						</ToggleGroupItem>
						<ToggleGroupItem value="light" className="flex-1">
							Claro
						</ToggleGroupItem>
						<ToggleGroupItem value="dark" className="flex-1">
							Escuro
						</ToggleGroupItem>
					</ToggleGroup>
				) : (
					<Skeleton className="h-9 w-full" />
				)}
			</CardContent>
		</Card>
	);
}

function InstallCard() {
	const { canInstall, installed, isIOS, promptInstall } = useInstallPrompt();

	return (
		<Card>
			<CardHeader>
				<CardTitle>Instalar app</CardTitle>
			</CardHeader>
			<CardContent>
				{installed ? (
					<p className="text-muted-foreground text-sm">App instalado. 🎉</p>
				) : canInstall ? (
					<Button onClick={promptInstall}>Adicionar à tela inicial</Button>
				) : isIOS ? (
					<p className="text-muted-foreground text-sm">
						No iPhone/iPad: toque em Compartilhar e depois em "Adicionar à Tela de
						Início".
					</p>
				) : (
					<p className="text-muted-foreground text-sm">
						Instalação indisponível neste navegador.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
