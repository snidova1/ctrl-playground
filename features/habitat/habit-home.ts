export type HabitHouseSettings = {
  timber: boolean;
  tall: boolean;
  roofColor: string;
  wallColor: string;
};

export const DEFAULT_HOUSE_SETTINGS: HabitHouseSettings = {
  timber: false,
  tall: false,
  roofColor: '#6f91bd',
  wallColor: '#ead8b8',
};
