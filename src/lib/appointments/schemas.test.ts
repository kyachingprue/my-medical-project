import assert from "node:assert/strict";
import {describe,it} from "node:test";
import {AppointmentStatus} from "@prisma/client";
import {
  appointmentListQuerySchema,
  appointmentStatusSchema,
  patientBookingSchema,
  receptionistBookingSchema,
} from "./schemas";

const booking={doctorId:"doctor-1",serviceId:"service-1",date:"2026-11-07",time:"10:15"};

describe("appointment request validation",()=>{
  it("accepts a valid patient booking and rejects malformed dates and times",()=>{
    assert.equal(patientBookingSchema.safeParse(booking).success,true);
    assert.equal(patientBookingSchema.safeParse({...booking,date:"2026-02-30"}).success,false);
    assert.equal(patientBookingSchema.safeParse({...booking,time:"10:10"}).success,false);
  });

  it("requires guest contact details unless an existing patient is selected",()=>{
    assert.equal(receptionistBookingSchema.safeParse(booking).success,false);
    assert.equal(receptionistBookingSchema.safeParse({...booking,patientName:"A Patient",patientPhone:"+8801700000000"}).success,true);
    assert.equal(receptionistBookingSchema.safeParse({...booking,patientId:"patient-1"}).success,true);
  });

  it("applies safe appointment list defaults and status validation",()=>{
    assert.deepEqual(appointmentListQuerySchema.parse({}),{page:1,limit:20,period:"upcoming"});
    assert.equal(appointmentStatusSchema.safeParse({status:AppointmentStatus.NO_SHOW}).success,true);
    assert.equal(appointmentStatusSchema.safeParse({status:"PENDING"}).success,false);
  });
});
