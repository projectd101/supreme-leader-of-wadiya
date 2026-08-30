"use client";

import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, flagEmoji } from "@/lib/countries";
import { useState } from "react";

type Props = {
  seatId: string;
  currentPriceCents: number;
  minRequiredCents: number;
  onClose: () => void;
};

type Step = "form" | "uploading" | "submitting" | "error";

export default function ClaimModal({
  seatId,
  currentPriceCents,
  minRequiredCents,
  onClose,
}: Props) {
  const supabase = createClient();
  const [step, setStep] = useState<Step>("form");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [location, setLocation] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [bidDollars, setBidDollars] = useState(
    (minRequiredCents / 100).toFixed(2)
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErrorMsg("Please choose an image file.");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setErrorMsg("Image must be under 8MB.");
      return;
    }
    setErrorMsg(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!file) return setErrorMsg("Upload a photo first.");
    if (!displayName.trim()) return setErrorMsg("Enter a name to display.");
    if (!ageConfirmed) return setErrorMsg("Confirm you're 18 or older.");
    if (!consentConfirmed)
      return setErrorMsg(
        "Confirm the photo is of you and you consent to it being shown publicly."
      );

    const bidCents = Math.round(parseFloat(bidDollars) * 100);
    if (!bidCents || bidCents < minRequiredCents) {
      return setErrorMsg(
        `Your bid must be at least $${(minRequiredCents / 100).toFixed(2)}.`
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return setErrorMsg("You need to sign in before claiming a seat.");
    }

    setStep("uploading");

    const ext = file.name.split(".").pop() ?? "jpg";
    const rawPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("raw-uploads")
      .upload(rawPath, file);

    if (uploadError) {
      setStep("error");
      setErrorMsg("Upload failed. Try a different photo.");
      return;
    }

    const {
      data: { publicUrl: rawUploadUrl },
    } = supabase.storage.from("raw-uploads").getPublicUrl(rawPath);

    const { data: charImage, error: charImageError } = await supabase
      .from("character_images")
      .insert({
        user_id: user.id,
        raw_upload_url: rawUploadUrl,
        composited_url: rawUploadUrl,
        seat_type: "supreme_leader",
        moderation_status: "pending",
      })
      .select()
      .single();

    if (charImageError || !charImage) {
      setStep("error");
      setErrorMsg("Couldn't save your photo. Try again.");
      return;
    }

    await supabase
      .from("users")
      .update({
        display_name: displayName.trim(),
        country_code: countryCode,
        location_text: location.trim(),
      })
      .eq("id", user.id);

    setStep("submitting");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seatId,
        characterImageId: charImage.id,
        bidAmountCents: bidCents,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setStep("error");
      setErrorMsg(result.error ?? "Checkout couldn't start. Try again.");
      return;
    }

    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        padding: "1.5rem",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "420px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--void)",
          border: "1px solid var(--gold-dim)",
          borderRadius: "8px",
          padding: "1.75rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <h2
            className="font-display"
            style={{
              fontSize: "18px",
              color: "var(--parchment)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Claim the Throne
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              color: "var(--parchment-dim)",
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <p
          style={{
            fontSize: "13px",
            color: "var(--parchment-dim)",
            marginBottom: "1.25rem",
          }}
        >
          Current price:{" "}
          <strong style={{ color: "var(--gold)" }}>
            ${(currentPriceCents / 100).toFixed(2)}
          </strong>
          . You must bid at least{" "}
          <strong style={{ color: "var(--gold)" }}>
            ${(minRequiredCents / 100).toFixed(2)}
          </strong>
          .
        </p>

        {errorMsg && (
          <p
            style={{
              fontSize: "13px",
              color: "var(--ember-bright)",
              marginBottom: "1rem",
            }}
          >
            {errorMsg}
          </p>
        )}

        {step === "uploading" || step === "submitting" ? (
          <p
            style={{
              fontSize: "14px",
              color: "var(--parchment-dim)",
              textAlign: "center",
              padding: "2rem 0",
            }}
          >
            {step === "uploading"
              ? "Uploading your photo…"
              : "Starting checkout…"}
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <label
                style={{
                  fontSize: "12px",
                  color: "var(--parchment-dim)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Your photo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{
                  fontSize: "13px",
                  color: "var(--parchment)",
                  width: "100%",
                }}
              />
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Preview of your uploaded photo"
                  style={{
                    marginTop: "10px",
                    width: "80px",
                    height: "80px",
                    objectFit: "cover",
                    borderRadius: "6px",
                    border: "1px solid var(--gold-dim)",
                  }}
                />
              )}
            </div>

            <div>
              <label
                style={{
                  fontSize: "12px",
                  color: "var(--parchment-dim)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Name to display
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Hendricks"
                maxLength={40}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#140d08",
                  border: "1px solid var(--gold-dim)",
                  borderRadius: "4px",
                  color: "var(--parchment)",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--parchment-dim)",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Country
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "#140d08",
                    border: "1px solid var(--gold-dim)",
                    borderRadius: "4px",
                    color: "var(--parchment)",
                    fontSize: "14px",
                  }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {flagEmoji(c.code)} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--parchment-dim)",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  City / place
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Austin"
                  maxLength={40}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    background: "#140d08",
                    border: "1px solid var(--gold-dim)",
                    borderRadius: "4px",
                    color: "var(--parchment)",
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  fontSize: "12px",
                  color: "var(--parchment-dim)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Your bid (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min={minRequiredCents / 100}
                value={bidDollars}
                onChange={(e) => setBidDollars(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  background: "#140d08",
                  border: "1px solid var(--gold-dim)",
                  borderRadius: "4px",
                  color: "var(--parchment)",
                  fontSize: "14px",
                }}
              />
            </div>

            <label
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
                fontSize: "12px",
                color: "var(--parchment-dim)",
              }}
            >
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => setAgeConfirmed(e.target.checked)}
                style={{ marginTop: "2px" }}
              />
              I am 18 years of age or older.
            </label>

            <label
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
                fontSize: "12px",
                color: "var(--parchment-dim)",
              }}
            >
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                style={{ marginTop: "2px" }}
              />
              This photo is of me, and I consent to it, my name, and my
              location being shown publicly.
            </label>

            <p
              style={{
                fontSize: "11px",
                color: "var(--parchment-dim)",
                lineHeight: 1.5,
              }}
            >
              If you&apos;re outbid, your seat is lost with no refund —
              you&apos;re paying for your time on the throne, not permanent
              ownership.
            </p>

            <button
              type="submit"
              style={{
                marginTop: "4px",
                padding: "12px",
                background: "var(--gold)",
                color: "var(--void)",
                border: "none",
                borderRadius: "4px",
                fontWeight: 700,
                fontSize: "13px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                cursor: "pointer",
              }}
            >
              Take the Throne — ${parseFloat(bidDollars || "0").toFixed(2)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
