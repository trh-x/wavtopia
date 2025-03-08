import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FormInput, FormError, FormButton } from "@/components/ui/FormInput";
import { useForm, ValidationRules } from "@/hooks/useForm";
import { api } from "@/api/client";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

interface RegisterData {
  email: string;
  username: string;
  password: string;
  inviteCode?: string;
}

function getValidationRules(
  earlyAccessRequired: boolean
): ValidationRules<RegisterData> {
  return {
    email: [
      {
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string),
        message: "Please enter a valid email address",
      },
    ],
    username: [
      {
        validate: (value) => (value as string).length >= 3,
        message: "Username must be at least 3 characters long",
      },
      {
        validate: (value) => /^[a-zA-Z0-9_-]+$/.test(value as string),
        message:
          "Username can only contain letters, numbers, underscores, and hyphens",
      },
    ],
    password: [
      {
        validate: (value) => (value as string).length >= 8,
        message: "Password must be at least 8 characters long",
      },
      {
        validate: (value) => /[A-Z]/.test(value as string),
        message: "Password must contain at least one uppercase letter",
      },
      {
        validate: (value) => /[a-z]/.test(value as string),
        message: "Password must contain at least one lowercase letter",
      },
      {
        validate: (value) => /[0-9]/.test(value as string),
        message: "Password must contain at least one number",
      },
    ],
    inviteCode: [
      {
        validate: (value) => {
          if (!earlyAccessRequired) return true;
          return (value as string)?.length > 0;
        },
        message: "Invite code is required",
      },
    ],
  };
}

export function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const { isFeatureEnabled } = useFeatureFlags();
  const isEarlyAccessRequired = isFeatureEnabled("EARLY_ACCESS_REQUIRED");

  const validationRules = getValidationRules(isEarlyAccessRequired);

  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    submitError,
  } = useForm<RegisterData>({
    initialValues: {
      email: "",
      username: "",
      password: "",
      inviteCode: "",
    },
    validationRules,
    onSubmit: async (values) => {
      const data = await api.auth.register(
        values.email,
        values.username,
        values.password,
        values.inviteCode
      );
      login(data.token, data.user);
      navigate("/");
    },
  });

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-3xl font-bold mb-8 text-center">Create an Account</h1>
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
          id="username"
          type="text"
          label="Username"
          required
          value={values.username}
          onChange={(e) => handleChange("username", e.target.value)}
          error={errors.username}
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

        {isEarlyAccessRequired && (
          <FormInput
            id="inviteCode"
            type="text"
            label="Invite Code"
            required
            value={values.inviteCode}
            onChange={(e) => handleChange("inviteCode", e.target.value)}
            error={errors.inviteCode}
          />
        )}

        <FormButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create Account"}
        </FormButton>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-primary-600 hover:text-primary-700 underline"
          >
            Login here
          </Link>
        </p>
      </form>
    </div>
  );
}
