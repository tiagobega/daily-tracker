import type { Dispatch, SetStateAction } from 'react';
import { createContext, useContext, useState } from 'react';
import type { IEvent, IUser } from '@/calendar/interfaces';
import type {
	TBadgeVariant,
	TCalendarView,
	TVisibleHours,
	TWorkingHours,
} from '@/calendar/types';

interface ICalendarContext {
	view: TCalendarView;
	setView: (view: TCalendarView) => void;
	selectedDate: Date;
	setSelectedDate: (date: Date | undefined) => void;
	selectedUserId: IUser['id'] | 'all';
	setSelectedUserId: (userId: IUser['id'] | 'all') => void;
	badgeVariant: TBadgeVariant;
	setBadgeVariant: (variant: TBadgeVariant) => void;
	users: IUser[];
	workingHours: TWorkingHours;
	setWorkingHours: Dispatch<SetStateAction<TWorkingHours>>;
	visibleHours: TVisibleHours;
	setVisibleHours: Dispatch<SetStateAction<TVisibleHours>>;
	events: IEvent[];
	setLocalEvents: Dispatch<SetStateAction<IEvent[]>>;
}

const CalendarContext = createContext({} as ICalendarContext);

const WORKING_HOURS: TWorkingHours = {
	0: { from: 0, to: 0 },
	1: { from: 8, to: 17 },
	2: { from: 8, to: 17 },
	3: { from: 8, to: 17 },
	4: { from: 8, to: 17 },
	5: { from: 8, to: 17 },
	6: { from: 8, to: 12 },
};
const VISIBLE_HOURS: TVisibleHours = { from: 7, to: 18 };

export function CalendarProvider({
	children,
	events,
	users = [],
	view,
	onViewChange,
	selectedDate,
	onSelectedDateChange,
}: {
	children: React.ReactNode;
	events: IEvent[];
	users?: IUser[];
	view: TCalendarView;
	onViewChange: (view: TCalendarView) => void;
	selectedDate: Date;
	onSelectedDateChange: (date: Date) => void;
}) {
	const [badgeVariant, setBadgeVariant] = useState<TBadgeVariant>('colored');
	const [visibleHours, setVisibleHours] = useState<TVisibleHours>(VISIBLE_HOURS);
	const [workingHours, setWorkingHours] = useState<TWorkingHours>(WORKING_HOURS);
	const [selectedUserId, setSelectedUserId] = useState<IUser['id'] | 'all'>(
		'all',
	);

	return (
		<CalendarContext.Provider
			value={{
				view,
				setView: onViewChange,
				selectedDate,
				setSelectedDate: (date) => {
					if (date) onSelectedDateChange(date);
				},
				selectedUserId,
				setSelectedUserId,
				badgeVariant,
				setBadgeVariant,
				users,
				visibleHours,
				setVisibleHours,
				workingHours,
				setWorkingHours,
				events,
				setLocalEvents: () => {},
			}}
		>
			{children}
		</CalendarContext.Provider>
	);
}

export function useCalendar(): ICalendarContext {
	const context = useContext(CalendarContext);
	if (!context)
		throw new Error('useCalendar must be used within a CalendarProvider.');
	return context;
}
