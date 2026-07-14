import {
  GENERAL_CONTACT_EMAIL,
  PROJECT_CONTACT_EMAIL,
  SUPPORT_CONTACT_EMAIL,
} from "../../data/contact-channels";

type Cleanup = () => void;
type FormTone = "error" | "success";
type WidgetId = number | string;

interface ApiEnvelope {
  data?: { id?: string; status?: string };
  error?: { code?: string; message?: string };
  ok?: boolean;
  requestId?: string;
}

interface TurnstileApi {
  getResponse(widgetId: WidgetId): string;
  remove(widgetId: WidgetId): void;
  render(
    container: HTMLElement,
    options: {
      action: string;
      appearance: "always";
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      "timeout-callback": () => void;
      "unsupported-callback": () => void;
      sitekey: string;
      size: "flexible";
      theme: "auto" | "dark" | "light";
    },
  ): WidgetId;
  reset(widgetId: WidgetId): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileLoader: Promise<TurnstileApi> | undefined;

/** Loads Cloudflare's unproxied Turnstile client once across Astro page swaps. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileLoader) return turnstileLoader;

  const loader = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("[data-turnstile-script]");
    const script = existing ?? document.createElement("script");
    const onLoad = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile loaded without exposing its client API"));
    };
    const onError = () => reject(new Error("Turnstile could not be loaded"));

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = "true";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      document.head.append(script);
    }
  }).catch((error: unknown) => {
    // A later Astro navigation should be allowed to retry a transient script failure.
    turnstileLoader = undefined;
    throw error;
  });

  turnstileLoader = loader;
  return loader;
}

/** Safely parses an API response without letting malformed JSON mask its status. */
async function responseBody(response: Response): Promise<ApiEnvelope> {
  try {
    return (await response.json()) as ApiEnvelope;
  } catch {
    return {};
  }
}

/** Returns the configured fallback mailbox for the active form channel. */
function fallbackEmail(form: HTMLFormElement): string {
  if (form.dataset.publicForm === "project") return PROJECT_CONTACT_EMAIL;
  const channel = new FormData(form).get("contactType");
  return channel === "support" ? SUPPORT_CONTACT_EMAIL : GENERAL_CONTACT_EMAIL;
}

/** Maps API and transport failures to useful, channel-aware public copy. */
function errorMessage(
  response: Response,
  body: ApiEnvelope,
  email: string,
  requestId?: string,
): string {
  const reference = requestId ? ` Reference: ${requestId}.` : "";

  if (response.status === 403 || body.error?.code === "TURNSTILE_VERIFICATION_FAILED") {
    return `The security check could not be verified. Refresh it and try again.${reference}`;
  }
  if (response.status === 422) {
    return `Please review the form fields and try again.${reference}`;
  }
  if (response.status === 429) {
    return `Too many messages were sent from this connection. Please wait before trying again.${reference}`;
  }
  if (response.status === 503 || body.error?.code === "DEPENDENCY_UNAVAILABLE") {
    return `This message service is temporarily unavailable. Please email ${email} instead.${reference}`;
  }
  return `We could not send your message. Please try again or email ${email}.${reference}`;
}

/** Applies a visible, screen-reader-announced status to one public form. */
function setStatus(status: HTMLElement, message: string, tone: FormTone): void {
  status.textContent = message;
  status.classList.remove(
    "hidden",
    "border-info",
    "bg-info/8",
    "border-destructive",
    "bg-destructive/8",
    "border-success",
    "bg-success/8",
  );
  status.classList.add(
    tone === "success" ? "border-success" : "border-destructive",
    tone === "success" ? "bg-success/8" : "bg-destructive/8",
  );
}

/** Keeps the unified Contact form aligned with its General or Support choice. */
function setupContactChoice(form: HTMLFormElement): Cleanup {
  const supportFields = form.querySelector<HTMLElement>("[data-support-fields]");
  const subject = form.querySelector<HTMLInputElement>("[name=subject]");
  const messageLabel = form.querySelector<HTMLElement>("[data-message-label]");
  const submitLabel = form.querySelector<HTMLElement>("[data-submit-label]");
  const radios = [...form.querySelectorAll<HTMLInputElement>("[name=contactType]")];

  const sync = () => {
    const isSupport = radios.some((radio) => radio.checked && radio.value === "support");
    supportFields?.classList.toggle("hidden", !isSupport);
    if (subject) {
      subject.placeholder = isSupport
        ? "What needs attention?"
        : "What would you like to ask or discuss?";
    }
    if (messageLabel) messageLabel.textContent = isSupport ? "Describe the issue" : "Your message";
    if (submitLabel) submitLabel.textContent = isSupport ? "Request support" : "Send enquiry";
  };

  radios.forEach((radio) => radio.addEventListener("change", sync));
  sync();
  return () => radios.forEach((radio) => radio.removeEventListener("change", sync));
}

/** Builds the strict endpoint and payload for the selected public channel. */
function submission(
  form: HTMLFormElement,
  token: string,
): {
  endpoint: string;
  payload: Record<string, string | string[]>;
  successMessage: string;
} {
  const data = new FormData(form);
  const common = {
    email: String(data.get("email") ?? ""),
    message: String(data.get("message") ?? ""),
    name: String(data.get("name") ?? ""),
    subject: String(data.get("subject") ?? ""),
    turnstileToken: token,
  };

  if (form.dataset.publicForm === "project") {
    const optional = (name: string) => String(data.get(name) ?? "").trim();
    const company = optional("company");
    const budgetRange = optional("budgetRange");
    const timeframe = optional("timeframe");
    const services = data.getAll("services").map(String);
    return {
      endpoint: "/public/project-intake",
      payload: {
        ...common,
        ...(company ? { company } : {}),
        ...(budgetRange ? { budgetRange } : {}),
        ...(timeframe ? { timeframe } : {}),
        ...(services.length > 0 ? { services } : {}),
      },
      successMessage:
        "Your project brief was accepted. We will review the context and reply using the email address you provided.",
    };
  }

  const isSupport = data.get("contactType") === "support";
  const clientReference = String(data.get("clientReference") ?? "").trim();
  return {
    endpoint: isSupport ? "/public/support" : "/public/inquiries",
    payload: {
      ...common,
      ...(isSupport && clientReference ? { clientReference } : {}),
    },
    successMessage: isSupport
      ? "Your support request was accepted. We will reply using the email address you provided."
      : "Your enquiry was accepted. We will reply using the email address you provided.",
  };
}

/** Enhances one public form with Turnstile, API submission, and resilient states. */
async function setupForm(form: HTMLFormElement): Promise<Cleanup> {
  const status = form.querySelector<HTMLElement>("[data-public-form-status]");
  const submit = form.querySelector<HTMLButtonElement>("[data-public-form-submit]");
  const widget = form.querySelector<HTMLElement>("[data-turnstile-widget]");
  const sitekey = widget?.dataset.turnstileSitekey ?? "";
  const action = widget?.dataset.turnstileAction ?? "";
  if (!status || !submit || !widget || !sitekey || !action) return () => undefined;

  let controller: AbortController | undefined;
  let token = "";
  let widgetId: WidgetId | undefined;
  let disposed = false;
  const choiceCleanup =
    form.dataset.publicForm === "contact" ? setupContactChoice(form) : () => undefined;

  try {
    const turnstile = await loadTurnstile();
    if (disposed) return choiceCleanup;
    const selectedTheme = document.documentElement.getAttribute("data-theme");
    const theme = selectedTheme === "dark" || selectedTheme === "light" ? selectedTheme : "auto";
    widgetId = turnstile.render(widget, {
      action,
      appearance: "always",
      callback: (nextToken) => {
        token = nextToken;
        submit.disabled = false;
      },
      "error-callback": () => {
        token = "";
        submit.disabled = true;
        setStatus(
          status,
          "The security check could not load. Please retry or use direct email.",
          "error",
        );
      },
      "expired-callback": () => {
        token = "";
        submit.disabled = true;
        setStatus(
          status,
          "The security check expired and is refreshing. Please wait a moment.",
          "error",
        );
      },
      "timeout-callback": () => {
        token = "";
        submit.disabled = true;
      },
      "unsupported-callback": () => {
        token = "";
        submit.disabled = true;
        setStatus(
          status,
          "This browser cannot run the security check. Please use direct email.",
          "error",
        );
      },
      sitekey,
      size: "flexible",
      theme,
    });
  } catch {
    setStatus(
      status,
      "The security check is unavailable. Please use the direct email option.",
      "error",
    );
    return () => {
      disposed = true;
      choiceCleanup();
    };
  }

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!token || widgetId === undefined || !window.turnstile) {
      setStatus(status, "Complete the security check before sending your message.", "error");
      return;
    }

    controller?.abort();
    controller = new AbortController();
    submit.disabled = true;
    status.classList.add("hidden");
    const label = form.querySelector<HTMLElement>("[data-submit-label]");
    if (label) label.textContent = "Sending…";
    const request = submission(form, token);
    const email = fallbackEmail(form);
    const apiBaseUrl = import.meta.env.PUBLIC_API_BASE_URL ?? "https://api.kenarhinlabs.com";

    try {
      const response = await fetch(`${apiBaseUrl}${request.endpoint}`, {
        body: JSON.stringify(request.payload),
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });
      const body = await responseBody(response);
      const requestId = body.requestId ?? response.headers.get("X-Request-Id") ?? undefined;

      if (response.status !== 202 || body.ok !== true) {
        setStatus(status, errorMessage(response, body, email, requestId), "error");
        return;
      }

      form.reset();
      // A native reset does not emit change, so resync the channel-dependent copy explicitly.
      form
        .querySelector<HTMLInputElement>("[name=contactType][value=general]")
        ?.dispatchEvent(new Event("change", { bubbles: true }));
      setStatus(
        status,
        `${request.successMessage}${requestId ? ` Reference: ${requestId}.` : ""}`,
        "success",
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus(status, `The network request failed. Please try again or email ${email}.`, "error");
    } finally {
      token = "";
      if (widgetId !== undefined && window.turnstile) window.turnstile.reset(widgetId);
      if (label) {
        const isProject = form.dataset.publicForm === "project";
        const isSupport = new FormData(form).get("contactType") === "support";
        label.textContent = isProject
          ? "Send project brief"
          : isSupport
            ? "Request support"
            : "Send enquiry";
      }
      // Reset keeps the button locked until the refreshed challenge returns a fresh token.
      submit.disabled = true;
    }
  };

  form.addEventListener("submit", onSubmit);
  return () => {
    disposed = true;
    controller?.abort();
    form.removeEventListener("submit", onSubmit);
    choiceCleanup();
    if (widgetId !== undefined && window.turnstile) window.turnstile.remove(widgetId);
  };
}

/** Sets up every public intake form in the current Astro document. */
export async function setupPublicIntakeForms(): Promise<Cleanup> {
  const forms = [...document.querySelectorAll<HTMLFormElement>("[data-public-form]")];
  const cleanups = await Promise.all(forms.map(setupForm));
  return () => cleanups.reverse().forEach((cleanup) => cleanup());
}
