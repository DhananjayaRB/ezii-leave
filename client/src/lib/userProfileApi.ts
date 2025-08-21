export interface UserProfileResponse {
  result: string;
  statuscode: number;
  message: string;
  data: {
    org_id: string;
    organization_name: string;
    organization_logo: string;
    user_id: string;
    email: string;
    employer_name: string;
    employee_number: string;
    user_profile: string | null;
    user_type_id: string;
    backgroundColor: string;
    isKycEnabled: string;
    isPan: boolean;
    isAadhar: boolean;
    isWhatsapp: boolean;
    is_exited: string;
  };
}

export const fetchUserProfile =
  async (): Promise<UserProfileResponse | null> => {
    try {
      const jwtToken = localStorage.getItem("jwt_token");

      console.log("[UserProfile] Fetching user profile...");
      console.log("[UserProfile] JWT token available:", !!jwtToken);

      // Check if we're currently on the token setup route
      const isTokenSetupRoute = window.location.pathname.startsWith("/id/");

      if (
        !jwtToken ||
        jwtToken.trim() === "" ||
        jwtToken === "null" ||
        jwtToken === "undefined"
      ) {
        if (isTokenSetupRoute) {
          console.log("[UserProfile] On token setup route, skipping redirect");
          return null;
        }
        console.log(
          "[UserProfile] Invalid or missing JWT token, redirecting to authentication...",
        );
        window.location.href = "https://services.resolvepay.in";
        return null;
      }

      const response = await fetch(
        "https://qa-api.resolveindia.com/organization/user-profile",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      console.log("[UserProfile] API response status:", response.status);

      if (!response.ok) {
        console.error(
          "[UserProfile] API request failed:",
          response.status,
          response.statusText,
        );
        return null;
      }

      const data: UserProfileResponse = await response.json();
      console.log("[UserProfile] API response data:", data);

      if (data.result === "Success" && data.statuscode === 200) {
        console.log("[UserProfile] Organization:", data.data.organization_name);
        console.log(
          "[UserProfile] Organization logo:",
          data.data.organization_logo,
        );
        return data;
      }

      return null;
    } catch (error) {
      console.error("[UserProfile] Error fetching user profile:", error);
      return null;
    }
  };
