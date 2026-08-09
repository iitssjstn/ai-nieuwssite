"use client";

import { useEffect, useState } from "react";

// Leest de opgeslagen cookie-keuze uit localStorage. "accepted" = advertenties
// mogen laden, "declined" of nog niets gekozen = geen advertentie-scripts.
// Bewust pas ná de eerste render (useEffect) ingelezen, zodat de server-
// gerenderde HTML en de eerste client-render overeenkomen (anders een
// hydration-mismatch, want de server kent localStorage niet).
export function useHasAdConsent() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    setHasConsent(localStorage.getItem("cookie_consent") === "accepted");

    function handleChange() {
      setHasConsent(localStorage.getItem("cookie_consent") === "accepted");
    }
    window.addEventListener("cookie-consent-changed", handleChange);
    return () => window.removeEventListener("cookie-consent-changed", handleChange);
  }, []);

  return hasConsent;
}
