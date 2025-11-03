// Redirect root to onboarding1
import React from "react";
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/onboarding1" />;
}
