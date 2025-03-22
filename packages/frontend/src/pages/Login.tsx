import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FormInput, FormError, FormButton } from "@/components/ui/forms";
import { useForm, ValidationRules } from "@/hooks/useForm";
import { api } from "@/api/client";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import {
  ControlledTooltip,
  TooltipContent,
  TooltipLink,
} from "@/components/ui/Tooltip";
import { useState } from "react";

interface LoginData {
  email: string;
  password: string;
}

const validationRules: ValidationRules<LoginData> = {
  email: [
    {
      validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string),
      message: "Please enter a valid email address",
    },
  ],
  password: [
    {
      validate: (value) => (value as string).length > 0,
      message: "Password is required",
    },
  ],
};

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const isEarlyAccessRequired = isFeatureEnabled("EARLY_ACCESS_REQUIRED");
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    submitError,
  } = useForm<LoginData>({
    initialValues: {
      email: "",
      password: "",
    },
    validationRules,
    onSubmit: async (values) => {
      const data = await api.auth.login(values.email, values.password);
      login(data.token, data.user);
      navigate("/");
    },
  });

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-3xl font-bold mb-8 text-center">Login to Wavtopia</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && <FormError message={submitError} />}

        <FormInput
          id="email"
          type="email"
          label="Email"
          required
          value={values.email}
          onChange={(e) => handleChange("email", e.target.value)}
          error={errors.email}
        />

        <FormInput
          id="password"
          type="password"
          label="Password"
          required
          value={values.password}
          onChange={(e) => handleChange("password", e.target.value)}
          error={errors.password}
        />

        <FormButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </FormButton>

        <div>
          <p className="mt-4 text-center">
            Don't have an account?{" "}
            <Link
              to={isEarlyAccessRequired ? "/request-early-access" : "/register"}
              className="text-primary-600 hover:text-primary-700 underline"
            >
              {isEarlyAccessRequired ? "Request early access" : "Register here"}
            </Link>
          </p>
          {isEarlyAccessRequired && (
            <div className="flex items-center justify-center">
              <span className="text-xs text-gray-500">
                Wavtopia is currently in early access. You'll need an invite
                code to register.
              </span>
              <ControlledTooltip>
                <button
                  type="button"
                  className="ml-1 text-gray-400 hover:text-gray-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <TooltipContent>
                  Have an invite code?{" "}
                  <TooltipLink to="/register">
                    Create your account here
                  </TooltipLink>
                </TooltipContent>
              </ControlledTooltip>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
