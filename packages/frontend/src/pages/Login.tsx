import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FormInput, FormError, FormButton } from "@/components/ui/FormInput";
import { useForm, ValidationRules } from "@/hooks/useForm";
import { api } from "@/api/client";

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

        <p className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-primary-600 hover:text-primary-700"
          >
            Request early access
          </Link>
          <br />
          <span className="text-xs text-gray-500">
            Wavtopia is currently in early access. You'll need an invite code to
            register.
          </span>
        </p>
      </form>
    </div>
  );
}
