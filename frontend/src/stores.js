import { writable } from "svelte/store";

export const isSliderActive = writable(false);
export const isLoading = writable(false);
export const data = writable(undefined);