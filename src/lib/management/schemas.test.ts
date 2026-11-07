import assert from "node:assert/strict";
import {describe,it} from "node:test";
import {Weekday} from "@prisma/client";
import {
  dhakaDateTimeToUtc,
  doctorSchema,
  mergeTimeOffUpdate,
  serviceSchema,
  timeOffSchema,
  workingHoursSchema,
} from "./schemas";

const validHours={doctorId:"doctor-1",dayOfWeek:Weekday.SATURDAY,startTime:"10:00",endTime:"13:00"};

describe("working hours validation",()=>{
  it("accepts clinic hours that end before lunch",()=>{
    assert.equal(workingHoursSchema.safeParse(validHours).success,true);
  });

  it("rejects Friday schedules",()=>{
    assert.equal(workingHoursSchema.safeParse({...validHours,dayOfWeek:Weekday.FRIDAY}).success,false);
  });

  it("rejects schedules outside clinic opening hours",()=>{
    assert.equal(workingHoursSchema.safeParse({...validHours,startTime:"09:30"}).success,false);
    assert.equal(workingHoursSchema.safeParse({...validHours,startTime:"14:00",endTime:"20:30"}).success,false);
  });

  it("rejects schedules overlapping the lunch break",()=>{
    assert.equal(workingHoursSchema.safeParse({...validHours,startTime:"12:30",endTime:"14:30"}).success,false);
  });

  it("rejects a zero-length or reversed interval",()=>{
    assert.equal(workingHoursSchema.safeParse({...validHours,startTime:"12:00",endTime:"12:00"}).success,false);
    assert.equal(workingHoursSchema.safeParse({...validHours,startTime:"12:30",endTime:"12:00"}).success,false);
  });
});

describe("management form validation",()=>{
  it("clears optional image URLs when the form input is blank",()=>{
    const doctor=doctorSchema.parse({name:"Dr. Example",email:"doctor@example.com",phone:"+8801700000000",profileImage:"",specialization:"Dentistry",qualification:"BDS",experienceYears:5,bio:"Provides thoughtful dental care for patients."});
    const service=serviceSchema.parse({name:"Dental care",slug:"dental-care",description:"A detailed description of the dental care service.",durationMinutes:30,price:1000,image:""});
    assert.equal(doctor.profileImage,null);
    assert.equal(service.image,null);
  });
});

describe("time-off validation",()=>{
  it("rejects invalid calendar dates and reversed ranges",()=>{
    assert.equal(timeOffSchema.safeParse({doctorId:"doctor-1",startAt:"2026-02-30T10:00",endAt:"2026-03-01T10:00",reason:"Annual leave"}).success,false);
    assert.equal(timeOffSchema.safeParse({doctorId:"doctor-1",startAt:"2026-03-02T11:00",endAt:"2026-03-02T10:00",reason:"Annual leave"}).success,false);
  });

  it("merges a partial update with the stored interval before validating",()=>{
    const current={doctorId:"doctor-1",startAt:dhakaDateTimeToUtc("2026-03-02T10:00"),endAt:dhakaDateTimeToUtc("2026-03-02T12:00"),reason:"Annual leave"};
    const result=mergeTimeOffUpdate(current,{startAt:"2026-03-02T11:00"});
    assert.equal(result.success,true);
    if(result.success){
      assert.equal(result.data.startAt.toISOString(),"2026-03-02T05:00:00.000Z");
      assert.equal(result.data.endAt.toISOString(),"2026-03-02T06:00:00.000Z");
      assert.equal(result.data.reason,"Annual leave");
    }
  });

  it("rejects a partial update that would invert the stored interval",()=>{
    const current={doctorId:"doctor-1",startAt:dhakaDateTimeToUtc("2026-03-02T10:00"),endAt:dhakaDateTimeToUtc("2026-03-02T12:00"),reason:"Annual leave"};
    assert.equal(mergeTimeOffUpdate(current,{startAt:"2026-03-02T13:00"}).success,false);
  });
});
