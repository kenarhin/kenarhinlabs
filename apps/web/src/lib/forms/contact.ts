import { PROJECT_CONTACT_EMAIL } from "../../data/contact-channels";

type Cleanup = () => void;

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
  };
  ok?: boolean;
  requestId?: string;
}

/** Safely parses an API response without allowing a malformed body to mask status handling. */
async function responseBody(response: Response): Promise<ApiErrorEnvelope> {
  try {
    return (await response.json()) as ApiErrorEnvelope;
  } catch {
    return {};
  }
}

/** Maps backend and transport failures to a useful public-facing message. */
function errorMessage(response: Response, body: ApiErrorEnvelope, requestId?: string): string {
  const reference = requestId ? ` Reference: ${requestId}.` : "";

  if (response.status === 422) {
    return `Please review the highlighted fields and try again.${reference}`;
  }
  if (response.status === 429) {
    return `Too many messages were sent from this connection. Please wait before trying again.${reference}`;
  }
  if (response.status === 503 || body.error?.code === "DEPENDENCY_UNAVAILABLE") {
    return `The project intake service is not available yet. Please email ${PROJECT_CONTACT_EMAIL} instead.${reference}`;
  }
  return `We could not send your note. Please try again or email ${PROJECT_CONTACT_EMAIL}.${reference}`;
}

/**
 * Enhances the contact form with the real Hono API contract.
 *
 * @returns Cleanup that aborts an active request and removes the submit listener.
 */
export function setupContactForm(): Cleanup {
  const form = document.querySelector<HTMLFormElement>("[data-contact-form]");
  const status = form?.querySelector<HTMLElement>("[data-contact-status]");
  const submit = form?.querySelector<HTMLButtonElement>("[data-contact-submit]");
  const submitLabel = form?.querySelector<HTMLElement>("[data-submit-label]");
  if (!form || !status || !submit || !submitLabel) return () => undefined;

  let controller: AbortController | undefined;
  const apiBaseUrl =
    import.meta.env.PUBLIC_API_BASE_URL ?? "https://api.kenarhinlabs.com";

  const setStatus = (message: string, tone: "error" | "success") => {
    status.textContent = message;
    status.classList.remove("hidden", "border-info", "bg-info/8", "border-destructive", "bg-destructive/8", "border-success", "bg-success/8");
    status.classList.add(
      tone === "success" ? "border-success" : "border-destructive",
      tone === "success" ? "bg-success/8" : "bg-destructive/8",
    );
  };

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    controller?.abort();
    controller = new AbortController();
    submit.disabled = true;
    submitLabel.textContent = "Sending…";
    status.classList.add("hidden");

    const data = new FormData(form);
    const payload = {
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
      name: String(data.get("name") ?? ""),
      subject: String(data.get("subject") ?? ""),
    };

    try {
      const response = await fetch(`${apiBaseUrl}/public/contact`, {
        body: JSON.stringify(payload),
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });
      const body = await responseBody(response);
      const requestId = body.requestId ?? response.headers.get("X-Request-Id") ?? undefined;

      if (!response.ok || body.ok === false) {
        setStatus(errorMessage(response, body, requestId), "error");
        return;
      }

      form.reset();
      setStatus(
        `Your project note was accepted. We will respond using the email address you provided.${requestId ? ` Reference: ${requestId}.` : ""}`,
        "success",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus(
        `The network request failed. Please try again or email ${PROJECT_CONTACT_EMAIL}.`,
        "error",
      );
    } finally {
      submit.disabled = false;
      submitLabel.textContent = "Send project note";
    }
  };

  form.addEventListener("submit", onSubmit);
  return () => {
    controller?.abort();
    form.removeEventListener("submit", onSubmit);
  };
}
