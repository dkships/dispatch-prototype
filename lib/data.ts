// Synthetic data for one dispatch day. Everything here is generated from a fixed
// seed, so every visitor (and every video take) sees the same board. There are no
// patients in this data at all: trips are identified by ID and destination type.

export type Vehicle = "sedan" | "wheelchair" | "stretcher";
export type Zone = "North" | "Central" | "South" | "East";
export type Destination = "dialysis" | "oncology" | "physical-therapy" | "discharge";
export type Cert = "wheelchair" | "stretcher" | "bariatric";

export type Driver = {
  id: string;
  name: string;
  vehicle: Vehicle;
  zone: Zone;
  shiftStart: number; // minutes from midnight
  shiftEnd: number;
  certs: Cert[];
  outSick?: boolean;
};

export type Trip = {
  id: string;
  start: number; // pickup time, minutes from midnight
  end: number; // drop-off time
  zone: Zone; // pickup zone
  destination: Destination;
  vehicle: Vehicle; // required vehicle type
  driverId: string;
  needsReassignment: boolean;
};

export const DAY_START = 6 * 60;
export const DAY_END = 18 * 60;

export const VEHICLE_LABEL: Record<Vehicle, string> = {
  sedan: "Sedan",
  wheelchair: "Wheelchair van",
  stretcher: "Stretcher van",
};

export const DESTINATION_LABEL: Record<Destination, string> = {
  dialysis: "Dialysis",
  oncology: "Oncology",
  "physical-therapy": "Physical therapy",
  discharge: "Hospital discharge",
};

export const DESTINATION_SHORT: Record<Destination, string> = {
  dialysis: "Dialysis",
  oncology: "Oncology",
  "physical-therapy": "PT",
  discharge: "Discharge",
};

const h = (hours: number, minutes = 0) => hours * 60 + minutes;

export const DRIVERS: Driver[] = [
  { id: "d01", name: "Ana Ruiz", vehicle: "wheelchair", zone: "South", shiftStart: h(7), shiftEnd: h(15), certs: ["wheelchair", "bariatric"] },
  { id: "d02", name: "Marcus Lee", vehicle: "sedan", zone: "Central", shiftStart: h(6), shiftEnd: h(14), certs: [] },
  { id: "d03", name: "Priya Shah", vehicle: "stretcher", zone: "North", shiftStart: h(8), shiftEnd: h(16), certs: ["stretcher", "wheelchair", "bariatric"] },
  { id: "d04", name: "Dana Brooks", vehicle: "wheelchair", zone: "South", shiftStart: h(7), shiftEnd: h(15), certs: ["wheelchair"], outSick: true },
  { id: "d05", name: "Tomas Okafor", vehicle: "sedan", zone: "East", shiftStart: h(8), shiftEnd: h(16), certs: [] },
  { id: "d06", name: "Grace Kim", vehicle: "wheelchair", zone: "Central", shiftStart: h(6), shiftEnd: h(14), certs: ["wheelchair"] },
  { id: "d07", name: "Luis Moreno", vehicle: "stretcher", zone: "South", shiftStart: h(9), shiftEnd: h(17), certs: ["stretcher", "wheelchair"] },
  { id: "d08", name: "Hannah Weiss", vehicle: "sedan", zone: "North", shiftStart: h(7), shiftEnd: h(15), certs: [] },
  { id: "d09", name: "Samuel Adeyemi", vehicle: "wheelchair", zone: "East", shiftStart: h(9), shiftEnd: h(17), certs: ["wheelchair", "bariatric"] },
  { id: "d10", name: "Mei Chen", vehicle: "sedan", zone: "South", shiftStart: h(10), shiftEnd: h(18), certs: [] },
  { id: "d11", name: "Jordan Price", vehicle: "stretcher", zone: "Central", shiftStart: h(7), shiftEnd: h(15), certs: ["stretcher", "wheelchair"] },
  { id: "d12", name: "Fatima Haddad", vehicle: "sedan", zone: "East", shiftStart: h(8), shiftEnd: h(16), certs: [] },
];

// mulberry32: tiny deterministic PRNG, so the board is identical on every load.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ZONES: Zone[] = ["North", "Central", "South", "East"];
const DESTINATIONS: Destination[] = ["dialysis", "oncology", "physical-therapy", "discharge"];

type Draft = Omit<Trip, "id">;

export type Plan = {
  seed: number;
  conflicts: { driverId: string; overlaps: number; offset: number; vehicle: Vehicle; zone: Zone; destination: Destination }[];
  sick: [number, Destination][];
};

// The base day comes from the seed. Where the five flagged trips land was chosen
// once, offline, so that every one of them has a suggestion and two alternates.
export const PLAN: Plan = {
  seed: 165,
  conflicts: [
    { driverId: "d02", overlaps: 1, offset: 15, vehicle: "sedan", zone: "Central", destination: "oncology" },
    { driverId: "d06", overlaps: 1, offset: 30, vehicle: "wheelchair", zone: "Central", destination: "dialysis" },
    { driverId: "d11", overlaps: 1, offset: 15, vehicle: "wheelchair", zone: "North", destination: "physical-therapy" },
  ],
  sick: [
    [h(8, 45), "dialysis"],
    [h(13, 30), "physical-therapy"],
  ],
};

export function generateTrips(plan: Plan = PLAN): Trip[] {
  const rand = mulberry32(plan.seed);
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const drafts: Draft[] = [];

  // Two drivers run a four-trip day; everyone else runs three.
  const fourTripDrivers = new Set(["d02", "d10"]);

  for (const driver of DRIVERS) {
    if (driver.outSick) continue;
    const count = fourTripDrivers.has(driver.id) ? 4 : 3;
    const slot = 15 * Math.floor((driver.shiftEnd - driver.shiftStart) / count / 15);
    for (let i = 0; i < count; i++) {
      // One trip per equal slice of the shift, with at least 15 minutes of slack
      // before the next slice, so the generated base schedule never overlaps.
      const duration = pick([45, 60, 60, 75]);
      const room = Math.max(0, Math.floor((slot - duration - 15) / 15));
      const start = driver.shiftStart + i * slot + 15 * Math.floor(rand() * (room + 1));
      const vehicle: Vehicle =
        driver.vehicle === "stretcher" && rand() < 0.35 ? "wheelchair" : driver.vehicle;
      drafts.push({
        start,
        end: start + duration,
        zone: rand() < 0.7 ? driver.zone : pick(ZONES),
        destination: vehicle === "stretcher" && rand() < 0.6 ? "discharge" : pick(DESTINATIONS),
        vehicle,
        driverId: driver.id,
        needsReassignment: false,
      });
    }
  }

  // Exactly three double-bookings: a second trip booked onto a driver,
  // starting partway into a trip they already have.
  for (const c of plan.conflicts) {
    const own = drafts.filter((t) => t.driverId === c.driverId).sort((a, b) => a.start - b.start);
    const start = own[c.overlaps].start + c.offset;
    drafts.push({
      driverId: c.driverId,
      vehicle: c.vehicle,
      zone: c.zone,
      destination: c.destination,
      start,
      end: start + 45,
      needsReassignment: false,
    });
  }

  // Exactly two trips stranded by a sick call: Dana Brooks' wheelchair runs.
  for (const [start, destination] of plan.sick) {
    drafts.push({ start, end: start + 60, zone: "South", destination, vehicle: "wheelchair", driverId: "d04", needsReassignment: true });
  }

  return drafts
    .sort((a, b) => a.start - b.start || a.driverId.localeCompare(b.driverId))
    .map((t, i) => ({ ...t, id: `T-${1001 + i}` }));
}

export const INITIAL_TRIPS: Trip[] = generateTrips();

export function driverById(id: string): Driver {
  const driver = DRIVERS.find((d) => d.id === id);
  if (!driver) throw new Error(`Unknown driver ${id}`);
  return driver;
}

export function firstName(driver: Driver) {
  return driver.name.split(" ")[0];
}

// Drive minutes between zone centres. Same-zone time varies per driver in lib/suggest.ts.
const ZONE_MINUTES: Record<Zone, Record<Zone, number>> = {
  North: { North: 0, Central: 15, South: 32, East: 21 },
  Central: { North: 15, Central: 0, South: 14, East: 16 },
  South: { North: 32, Central: 14, South: 0, East: 19 },
  East: { North: 21, Central: 16, South: 19, East: 0 },
};

export function zoneMinutes(from: Zone, to: Zone) {
  return ZONE_MINUTES[from][to];
}

export function formatTime(minutes: number, withPeriod = true) {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hours12 = ((hours24 + 11) % 12) + 1;
  const time = `${hours12}:${String(mins).padStart(2, "0")}`;
  return withPeriod ? `${time} ${hours24 < 12 ? "AM" : "PM"}` : time;
}

export function formatRange(start: number, end: number) {
  const samePeriod = start < 12 * 60 === end < 12 * 60;
  return samePeriod
    ? `${formatTime(start, false)}–${formatTime(end)}`
    : `${formatTime(start)}–${formatTime(end)}`;
}

export type Conflict = { driverId: string; keep: Trip; move: Trip };

// A double-booking is two trips on one driver whose times overlap. The later
// booking is the one we offer to move.
export function findConflicts(trips: Trip[]): Conflict[] {
  const conflicts: Conflict[] = [];
  for (const driver of DRIVERS) {
    const own = trips.filter((t) => t.driverId === driver.id).sort((a, b) => a.start - b.start);
    for (let i = 0; i < own.length; i++) {
      for (let j = i + 1; j < own.length; j++) {
        if (own[j].start < own[i].end) conflicts.push({ driverId: driver.id, keep: own[i], move: own[j] });
      }
    }
  }
  return conflicts;
}
