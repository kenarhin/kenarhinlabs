import type { TransactionalEmailAttachment } from "./types";

const BRAND_MARK_CONTENT_ID = "ken-arhin-labs-mark";

// Generated from packages/design/src/assets/logo/email-mark.png. Keeping this
// small raster inline avoids remote-image blocking and public storage requests.
const BRAND_MARK_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAJAAAACQCAMAAADQmBKKAAAA0lBMVEXy7uXu6uH38+r+/PPSzcWLiINtbGd7eXS1squEgnwQEA8ICAdSUU7m49oVFRM2NTLW08uTkYwQDg1KSUVwbmnAvbd0cW2AfXjGw7wyMS4gIB7h3tewraXd2dKkoZopKCa8ubKsqaOgnZhaWVX59exjYl3MycKPjIWZl5EPDw7u8+7z2sr8spH1oX34lWyBaV3x5Nn9VBX9SgfnSw+vPA8jGhYKERNiXVj1ZzHWSxQpFg5CQT7+UA5wLxWLOBYDDhE+HhBYKhbKSRT4wKbRmH9APzwave7xAAAEGUlEQVR42u2ba1fiMBCGOxmurQQsK4KKyIKXddVdvOCirq57+f9/aVsokBTbpucwST/k/eih5zwmDXnnncFxrKysrKysrKysrKysrBIFoYrEwzCQUxwkLJUr1RpjReFhddcLtNNghVgjwLrHQ3nNYuwZa/FI3i6C+XMAuOtFQH47x1sUHgOSLQb8tALKsWe4V+3sd5EEqLIC6oHq1wSrhMfAr7JCAAFzdqJzUEcwDwQM2tEj7sEhMw4ErNFcPsH9o60vUV4gwH5vxcO9Y9NAgKXBmof7J4aBALsH/prHaxo+ZYAnXOBx/ZrZUwY4dF2Bx93+K50LCPCzL/JwgvXJBbS+9eaf5ntIc5epAi1tSvThgy4S3faKQFgVebxBiYZHEQgcVpF5WkQ8akDB9T7yhLfZ6x2OqeylCtD6el9+HxLabwUg4Xpf8LSBsBzIBoKxcL3PeRzK8iQTCMZ9mWeHkZZLWUCArYHEc8poS9wMIMCzgS/yVKgL3HSgwG5wiadDHgGkAsXsRmjqNVTSyUCANZnnnJ4nDSiwP6Ld4N4FgkmguP3xj3XwJAMBXojH3XWHWniSgfBc5PlCYw9zAGFZtocnmniSgGQ7RmYPVYDmQRR29NjDbCBgl4Fi9rDX0scjAzXY5der65urbzJPXyOPDDT+fjO5DXR3/zDVYg/TgTh//HE7WWj2FBF5z6A3LZaA7l8insnLTIddzQCa/pwIen3TYA8Tgdx5dTMTge5CnkftPMIKTX9NJL1PA7uqv9sgAL3LQD/fOsxAhygNqIYGuh/ilr3EtkyTA0o+9vJL/cBdPR4x+di/bh77cwSDK8R/r3mWX4xlBHNA06fZ5tVRRWNA/uCsdDN5CS7XySufirWhKaAmC+zHn+urv09vWqvnFD+0MGh4IZaHmi+QDy2sHJAHV6zDwBjQ4o9HMlFbH9HHVcdGyvCszTYmlEEbOUyzMTZbKMYaY/qsfkpt3+ppyspV049Y+urrKRfT8iHW+CcRPegoqFMTtFhiTtWRypExxnoKroZQJiOFlbouWmKrrJzaGZ9KROS2NjPJd8ZSNEMefSp0g+TwijocVmlPyfFeaGvNAoVTWLJBqhI2GNRanHgsR+gVOiLFJjAOuUxEVmUrtsk3DNKIytaq9u03DBJVkqU8SLDRyiMiUh+1kGeryNLQPNMx8fZ085AZHdcJDZLcwO9tf0gv54QVc2Sikek5xrgd4SXSOUaFWdjYmAzx2KDacO56mjcAGhYASLQjbne8/S1beQuvrWgrVsNfXpvg3AsT56peMOwPh/F/UDuSzC/ve8uxF+WH8KjN+eC0T3OdsTIPp7VHDZbjv2CtswZSJSJY2q3W9zDP8gfHnzBWi375UiQV7LdBVlZWVlZWVlZWVlZWVlZWhdN/WLGoBTHQNz0AAAAASUVORK5CYII=";

/** Decodes the optimized brand mark into bytes accepted by Email Service. */
function brandMarkBytes(): Uint8Array {
  return Uint8Array.from(atob(BRAND_MARK_BASE64), (character) => character.charCodeAt(0));
}

/** Creates the inline logo attachment referenced by the shared email shell. */
export function createEmailBrandAttachment(): TransactionalEmailAttachment {
  return {
    content: brandMarkBytes(),
    contentId: BRAND_MARK_CONTENT_ID,
    disposition: "inline",
    filename: "ken-arhin-labs-mark.png",
    type: "image/png",
  };
}

/** Stable Content-ID URL used by the email template's image element. */
export const EMAIL_BRAND_MARK_SOURCE = `cid:${BRAND_MARK_CONTENT_ID}`;
