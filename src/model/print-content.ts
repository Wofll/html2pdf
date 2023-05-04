import { PrintText } from "./print-text";

export interface PrintContent {
    element: HTMLElement;
    html: string;
    text: PrintText;
    height: number;
  }