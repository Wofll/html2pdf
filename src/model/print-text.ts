import { PrintMargin } from "./print-margin";

export interface PrintText {
  leftText: string;
  centerText: string;
  rightText: string;
  fontFamily: string;
  fontSize: number;
  newLine: boolean;
  margin: PrintMargin;
}
