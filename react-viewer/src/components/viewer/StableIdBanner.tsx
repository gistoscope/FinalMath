import React from "react";

interface StableIdBannerProps {
  reason: string | null;
}

const StableIdBanner: React.FC<StableIdBannerProps> = ({ reason }) => {
  if (!reason) return null;

  return (
    <div
      id="stable-id-banner"
      style={{
        background: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #f87171",
        padding: "8px 12px",
        borderRadius: "6px",
        marginBottom: "10px",
        fontSize: "13px",
        fontWeight: "bold",
        textAlign: "center",
      }}
    >
      ⚠️ Precise selection disabled: {reason}
    </div>
  );
};

export default StableIdBanner;
