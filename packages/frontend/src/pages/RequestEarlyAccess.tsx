import { useState } from "react";
import { Link } from "react-router-dom";
import { FormInput, FormButton } from "@/components/ui/FormInput";
import { useForm, ValidationRules } from "@/hooks/useForm";
import { api } from "@/api/client";

interface RequestData {
  email: string;
}

const validationRules: ValidationRules<RequestData> = {
  email: [
    {
      validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string),
      message: "Please enter a valid email address",
    },
  ],
};

export function RequestEarlyAccess() {
  const [isSuccess, setIsSuccess] = useState(false);
  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    submitError,
  } = useForm<RequestData>({
    initialValues: {
      email: "",
    },
    validationRules,
    onSubmit: async (values) => {
      const response = await api.auth.requestEarlyAccess(values.email);
      if (response.success) {
        setIsSuccess(true);
      }
    },
  });

  return (
    <div className="max-w-md mx-auto mt-16">
      <h1 className="text-3xl font-bold mb-4 text-center">
        Request Early Access
      </h1>
      <p className="text-gray-600 mb-8 text-center">
        Enter your email address to request early access to Wavtopia. We'll send
        you an invite code when a spot opens up.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && (
          <div className="p-4 rounded bg-red-100 text-red-800">
            {submitError}
          </div>
        )}

        {isSuccess && (
          <div className="p-4 rounded bg-green-100 text-green-800">
            Thanks for your interest! We'll send you an invite code when a spot
            opens up.
          </div>
        )}

        <FormInput
          id="email"
          type="email"
          label="Email"
          required
          value={values.email}
          onChange={(e) => handleChange("email", e.target.value)}
          error={errors.email}
        />

        <FormButton type="submit" disabled={isSubmitting || isSuccess}>
          {isSubmitting ? "Requesting..." : "Request Access"}
        </FormButton>
      </form>

      <p className="text-center text-sm text-gray-600 mt-4">
        Have an invite code?{" "}
        <Link
          to="/register"
          className="text-primary-600 hover:text-primary-700 underline"
        >
          Create your account here
        </Link>
      </p>
    </div>
  );
}
