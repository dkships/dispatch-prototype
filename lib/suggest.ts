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

// Eligibility is shared by every arm: who is qualified and free for this trip.
// Only `suggestDrivers` below adds ranking and reasons, so the 1-click arm sees
// exactly the same drivers as the AI arm, minus the "AI".

export type Eligible = {
  driver: Driver;
  freeFrom: number;
  freeTo: number;
  location: Zone;
  minutesAway: number;
  load: number;
};

export type Candidate = Eligible & {
  score: number;
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

// Qualified drivers who are free for the trip window, alphabetical. No ranking.
export function eligibleDrivers(trip: Trip, trips: Trip[]): Eligible[] {
  const eligible: Eligible[] = [];

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

    // Where the driver will be: their last pickup zone, or home if they have
    // not driven yet. Same-zone time varies a little per driver and hour.
    const location = before ? before.zone : driver.zone;
    const minutesAway =
      location === trip.zone
        ? 4 + ((index * 5 + Math.floor(trip.start / 15)) % 7)
        : zoneMinutes(location, trip.zone);

    eligible.push({
      driver,
      freeFrom: before ? before.end : driver.shiftStart,
      freeTo: after ? after.start : driver.shiftEnd,
      location,
      minutesAway,
      load: own.length,
    });
  });

  return eligible.sort((a, b) => a.driver.name.localeCompare(b.driver.name));
}

function vehicleReason(driver: Driver, trip: Trip) {
  if (trip.vehicle === "wheelchair") return `${VEHICLE_LABEL[driver.vehicle]}, wheelchair certified`;
  if (trip.vehicle === "stretcher") return "Stretcher van, stretcher certified";
  return driver.vehicle === "sedan"
    ? "Sedan, right size for this rider"
    : `${VEHICLE_LABEL[driver.vehicle]} can take a seated rider`;
}

// WIZARD-OF-OZ STUB. This is not a model. It is a handful of deterministic rules
// (vehicle match, availability, zone distance, current load) dressed up as an
// "AI suggestion" so we can measure one thing before building anything real:
// do dispatchers accept a suggested driver, and does it beat the plain 1-click
// list? If it does, a trained model replaces this function behind the same
// signature. No external API is called.
export function suggestDrivers(trip: Trip, trips: Trip[]): Candidate[] {
  const candidates: Candidate[] = eligibleDrivers(trip, trips).map((e) => {
    const overSized = e.driver.vehicle !== trip.vehicle;
    return {
      ...e,
      score: e.minutesAway + e.load * 6 + (overSized ? 12 : 0),
      reasons: [
        `Free ${formatRange(e.freeFrom, e.freeTo)}`,
        vehicleReason(e.driver, trip),
        e.location === trip.zone
          ? `Already in ${e.location} zone, ${e.minutesAway} min away`
          : `In ${e.location} zone, ${e.minutesAway} min away`,
      ],
    };
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
