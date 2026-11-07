import assert from "node:assert/strict";
import {describe,it} from "node:test";
import {Weekday} from "@prisma/client";
import {
  addBusinessDays,
  appointmentDateSchema,
  businessDateAt,
  businessDayOfWeek,
  businessLocalDateTimeToUtc,
  canPatientCancelAppointment,
  intervalsOverlap,
  minutesAfter,
  slotTimeSchema,
  utcToBusinessLocalDateTime,
} from "./time";

describe("appointment business time",()=>{
  it("uses Dhaka calendar dates across UTC midnight",()=>{
    assert.equal(businessDateAt(new Date("2026-01-01T18:30:00.000Z")),"2026-01-02");
    assert.deepEqual(utcToBusinessLocalDateTime(new Date("2026-01-01T18:30:00.000Z")),{date:"2026-01-02",time:"00:30"});
  });

  it("converts Dhaka appointment times to UTC",()=>{
    assert.equal(businessLocalDateTimeToUtc("2026-11-07","10:00").toISOString(),"2026-11-07T04:00:00.000Z");
  });

  it("validates calendar dates and supported slot increments",()=>{
    assert.equal(appointmentDateSchema.safeParse("2026-02-28").success,true);
    assert.equal(appointmentDateSchema.safeParse("2026-02-30").success,false);
    assert.equal(slotTimeSchema.safeParse("10:00").success,true);
    assert.equal(slotTimeSchema.safeParse("20:45").success,true);
    assert.equal(slotTimeSchema.safeParse("10:10").success,false);
    assert.equal(slotTimeSchema.safeParse("21:00").success,false);
  });

  it("adds calendar days and resolves weekdays",()=>{
    assert.equal(addBusinessDays("2026-11-06",1),"2026-11-07");
    assert.equal(businessDayOfWeek("2026-11-06"),Weekday.FRIDAY);
  });

  it("treats touching appointment intervals as non-overlapping",()=>{
    const firstStart=new Date("2026-11-07T04:00:00.000Z");
    const firstEnd=new Date("2026-11-07T04:30:00.000Z");
    const nextStart=new Date("2026-11-07T04:35:00.000Z");
    const nextEnd=new Date("2026-11-07T05:00:00.000Z");
    assert.equal(intervalsOverlap(firstStart,firstEnd,nextStart,nextEnd),false);
    assert.equal(intervalsOverlap(firstStart,firstEnd,new Date("2026-11-07T04:29:00.000Z"),nextEnd),true);
  });

  it("adds minutes without losing minute rollover",()=>{
    assert.equal(minutesAfter("19:45",20),"20:05");
  });

  it("allows patient cancellation at least two hours before the appointment",()=>{
    const now=new Date("2026-11-07T04:00:00.000Z");
    assert.equal(canPatientCancelAppointment(new Date("2026-11-07T06:00:00.000Z"),now),true);
    assert.equal(canPatientCancelAppointment(new Date("2026-11-07T05:59:59.999Z"),now),false);
    assert.equal(canPatientCancelAppointment(new Date("2026-11-07T03:59:59.999Z"),now),false);
  });
});
