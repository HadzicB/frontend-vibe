// A search result from the backend. Not saved yet.
export type AddressCandidate = {
  displayName: string; // one readable line for the dropdown
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string;
  region: string | null;
  country: string;
  countryCode: string | null;
  latitude: number;
  longitude: number;
};

export type CurrentWeather = {
  temperature: number; // degrees Celsius
  weatherCode: number; // WMO code, see lib/weather.ts
  isDay: boolean;
  windSpeed: number; // km/h
  observedAt: string; // ISO date string (UTC)
};

// A saved address, as the backend returns it
export type Address = Omit<AddressCandidate, "displayName"> & {
  id: number;
  displayName: string | null; // the line the user picked; null for older addresses
  label: string | null; // the user's own name for it, e.g. "Home"
  createdAt: string;
  // Only present when requested. null = the weather provider had no data.
  weather?: CurrentWeather | null;
};

// What the form sends to be saved: the picked candidate plus the user's label
export type NewAddress = AddressCandidate & {
  label: string | null;
};

export type CreateAddressResult = {
  success: boolean;
  errors?: Record<string, string[]>; // field errors sent by the backend (400/409)
};

export type AddressActionState = {
  message?: string;
  errors?: Record<string, string[]>;
  values?: { label?: string }; // submitted values to refill the form
};
