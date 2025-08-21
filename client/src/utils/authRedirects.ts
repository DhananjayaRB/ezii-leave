// Authentication redirect utility based on plan status
interface PlanStatusResponse {
  message: string;
  expiryFlag: boolean;
  isAdmin: boolean;
  isSaas: boolean;
  isPartner: boolean;
  organizationLogo: string;
}

const fetchPlanStatusForRedirect =
  async (): Promise<PlanStatusResponse | null> => {
    try {
      const jwtToken = localStorage.getItem("jwt_token");

      if (
        !jwtToken ||
        jwtToken === "null" ||
        jwtToken === "undefined" ||
        jwtToken.trim() === ""
      ) {
        return null;
      }

      const response = await fetch(
        "https://qa-api.resolveindia.com/organization/plan-status",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        return null;
      }

      return response.json();
    } catch (error) {
      console.error("[AuthRedirect] Error fetching plan status:", error);
      return null;
    }
  };

export const redirectToLogin = async (): Promise<void> => {
  try {
    console.log("[AuthRedirect] Checking plan status for login redirect...");

    const planStatus = await fetchPlanStatusForRedirect();

    if (planStatus && planStatus.isSaas !== undefined) {
      const loginUrl = planStatus.isSaas
        ? "https://app.ezii.co.in/login"
        : "https://services.resolvepay.in/login";

      console.log(
        `[AuthRedirect] Redirecting to login: ${loginUrl} (isSaas: ${planStatus.isSaas})`,
      );
      window.location.href = loginUrl;
    } else {
      // Fallback to default if plan status is not available
      console.log(
        "[AuthRedirect] Plan status not available, using default redirect",
      );
      window.location.href = "https://services.resolvepay.in/login";
    }
  } catch (error) {
    console.error("[AuthRedirect] Error during login redirect:", error);
    // Fallback to default if there's an error
    window.location.href = "https://services.resolvepay.in/login";
  }
};
