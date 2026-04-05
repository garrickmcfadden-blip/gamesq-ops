export interface KPIThresholds {
  unsignedRetainerDays: number;
  recordsToDemandDays: number;
  demandWithoutOfferDays: number;
  staleMatterDays: number;
}

export const defaultThresholds: KPIThresholds = {
  unsignedRetainerDays: 3,
  recordsToDemandDays: 30,
  demandWithoutOfferDays: 21,
  staleMatterDays: 14,
};
