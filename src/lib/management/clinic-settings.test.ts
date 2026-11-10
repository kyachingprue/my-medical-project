import assert from "node:assert/strict";
import {describe,it} from "node:test";
import {clinicSettingsSchema,clinicWeekdays} from "./clinic-settings";

const validSettings={
  bookingEnabled:true,
  announcementEnabled:false,
  announcement:"",
  businessHours:clinicWeekdays.map(dayOfWeek=>({
    dayOfWeek,
    isOpen:dayOfWeek!=="FRIDAY",
    startTime:"10:00",
    endTime:"20:00",
    breakStart:dayOfWeek==="FRIDAY"?null:"13:00",
    breakEnd:dayOfWeek==="FRIDAY"?null:"14:00",
  })),
};

describe("clinic settings validation",()=>{
  it("accepts a complete weekly schedule and disabled announcement",()=>{
    assert.equal(clinicSettingsSchema.safeParse(validSettings).success,true);
  });

  it("requires non-empty text when an announcement is published",()=>{
    assert.equal(clinicSettingsSchema.safeParse({...validSettings,announcementEnabled:true}).success,false);
    assert.equal(clinicSettingsSchema.safeParse({...validSettings,announcementEnabled:true,announcement:"Clinic closed today."}).success,true);
  });

  it("requires exactly one entry for every day",()=>{
    assert.equal(clinicSettingsSchema.safeParse({...validSettings,businessHours:validSettings.businessHours.slice(1)}).success,false);
    assert.equal(clinicSettingsSchema.safeParse({...validSettings,businessHours:validSettings.businessHours.map((entry,index)=>index===6?{...entry,dayOfWeek:"SUNDAY" as const}:entry)}).success,false);
  });

  it("rejects opening intervals and break times outside the working day",()=>{
    assert.equal(clinicSettingsSchema.safeParse({...validSettings,businessHours:validSettings.businessHours.map((entry,index)=>index===0?{...entry,startTime:"20:00"}:entry)}).success,false);
    assert.equal(clinicSettingsSchema.safeParse({...validSettings,businessHours:validSettings.businessHours.map((entry,index)=>index===0?{...entry,breakEnd:"21:00"}:entry)}).success,false);
  });
});
