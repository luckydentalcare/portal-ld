import { Schema, model, Document } from 'mongoose';

export interface IDropdownOption {
  id: string;
  name: string;
  active: boolean;
  order: number;
}

export interface IAppointmentOptions extends Document {
  services: IDropdownOption[];
  schedules: IDropdownOption[];
  createdAt: Date;
  updatedAt: Date;
}

const dropdownOptionSchema = new Schema<IDropdownOption>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 }
  },
  { _id: false }
);

const appointmentOptionsSchema = new Schema<IAppointmentOptions>(
  {
    services: [dropdownOptionSchema],
    schedules: [dropdownOptionSchema]
  },
  { timestamps: true }
);

export const AppointmentOptions = model<IAppointmentOptions>('AppointmentOptions', appointmentOptionsSchema);
