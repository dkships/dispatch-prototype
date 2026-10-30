// WIZARD-OF-OZ STUB. This is not a model. It is a handful of deterministic rules
// (vehicle match, availability, zone distance, current load) dressed up as an
// "AI suggestion" so we can measure one thing before building anything real:
// do dispatchers accept a suggested driver? If they do, a trained model replaces
// this file behind the same `suggestDrivers` signature. No external API is called.

import {
  DRIVERS,
  VEHICLE_LABEL,
  firstName,
  formatRange,
  zoneMinutes,
  type Driver,
  type Trip,
  type Vehicle,
  type Zone,
} from "./data";

export type Candidate = {
  driver: Driver;
  score: number;
  freeFrom: number;
  freeTo: number;
  location: Zone;
  minutesAway: number;
  load: number;
  reasons: string[];
  caveat?: string;
};

// Minutes kept clear between one drop-off and the next pickup.
const TURNAROUND = 15;

// Which vehicles can legally carry which trip types.
const CAN_CARRY: Record<Vehicle, Vehicle[]> = {
  sedan: ["sedan"],
  wheelchair: ["sedan", "wheelchair"],
  stretcher: ["wheelchair", "stretcher"],
};

function isQualified(driver: Driver, trip: Trip) {
  if (!CAN_CARRY[driver.vehicle].includes(trip.vehicle)) return false;
  if (trip.vehicle === "wheelchair") return driver.certs.includes("wheelchair");
  if (trip.vehicle === "stretcher") return driver.certs.includes("stretcher");
  return true;
}

function vehicleReason(driver: Driver, trip: Trip) {
  if (trip.vehicle === "wheelchair") return `${VEHICLE_LABEL[driver.vehicle]}, wheelchair certified`;
  if (trip.vehicle === "stretcher") return "Stretcher van, stretcher certified";
  return driver.vehicle === "sedan"
    ? "Sedan, right size for this rider"
    : `${VEHICLE_LABEL[driver.vehicle]} can take a seated rider`;
}

export function suggestDrivers(trip: Trip, trips: Trip[]): Candidate[] {
  const candidates: Candidate[] = [];

  DRIVERS.forEach((driver, index) => {
    if (driver.outSick || driver.id === trip.driverId) return;
    if (!isQualified(driver, trip)) return;
    if (trip.start < driver.shiftStart || trip.end > driver.shiftEnd) return;

    const own = trips
      .filter((t) => t.driverId === driver.id && t.id !== trip.id)
      .sort((a, b) => a.start - b.start);
    const clashes = own.some(
      (t) => t.start < trip.end + TURNAROUND && trip.start < t.end + TURNAROUND,
    );
    if (clashes) return;

    const before = own.filter((t) => t.end <= trip.start).at(-1);
    const after = own.find((t) => t.start >= trip.end);
    const freeFrom = before ? before.end : driver.shiftStart;
    const freeTo = after ? after.start : driver.shiftEnd;

    // Where the driver will be: their last pickup zone, or home if they have
    // not driven yet. Same-zone time varies a little per driver and hour.
    const location = before ? before.zone : driver.zone;
    const minutesAway =
      location === trip.zone
        ? 4 + ((index * 5 + Math.floor(trip.start / 15)) % 7)
        : zoneMinutes(location, trip.zone);

    const load = own.length;
    const overSized = driver.vehicle !== trip.vehicle;
    const score = minutesAway + load * 6 + (overSized ? 12 : 0);

    candidates.push({
      driver,
      score,
      freeFrom,
      freeTo,
      location,
      minutesAway,
      load,
      reasons: [
        `Free ${formatRange(freeFrom, freeTo)}`,
        vehicleReason(driver, trip),
        location === trip.zone
          ? `Already in ${location} zone, ${minutesAway} min away`
          : `In ${location} zone, ${minutesAway} min away`,
      ],
    });
  });

  candidates.sort((a, b) => a.score - b.score || a.driver.id.localeCompare(b.driver.id));

  const top = candidates[0];
  for (const alt of candidates.slice(1)) {
    if (alt.minutesAway > top.minutesAway) {
      alt.caveat = `${alt.minutesAway - top.minutesAway} min farther than ${firstName(top.driver)}`;
    } else if (alt.load > top.load) {
      alt.caveat = `Busier day: ${alt.load} trips already`;
    } else if (alt.driver.vehicle !== trip.vehicle) {
      alt.caveat = "Bigger vehicle than this trip needs";
    } else {
      alt.caveat = "Close second on every rule";
    }
  }

  return candidates;
}
