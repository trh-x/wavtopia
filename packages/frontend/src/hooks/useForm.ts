import { useState, useCallback } from "react";

export type ValidationRule<T> = {
  validate: (value: T[keyof T], values: T) => boolean;
  message: string;
};

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T>[];
};

interface UseFormOptions<T extends object> {
  initialValues: T;
  validationRules?: ValidationRules<T>;
  onSubmit: (values: T) => Promise<void>;
}

export function useForm<T extends object>({
  initialValues,
  validationRules = {},
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validateField = useCallback(
    (name: keyof T, value: T[keyof T]) => {
      const fieldRules = validationRules[name];
      if (!fieldRules) return true;

      for (const rule of fieldRules) {
        if (!rule.validate(value, values)) {
          setErrors((prev) => ({ ...prev, [name]: rule.message }));
          return false;
        }
      }

      setErrors((prev) => ({ ...prev, [name]: undefined }));
      return true;
    },
    [validationRules, values]
  );

  const validateForm = useCallback(() => {
    let isValid = true;
    const newErrors: Partial<Record<keyof T, string>> = {};

    Object.keys(values).forEach((key) => {
      const fieldRules = validationRules[key as keyof T];
      if (!fieldRules) return;

      for (const rule of fieldRules) {
        if (!rule.validate(values[key as keyof T], values)) {
          newErrors[key as keyof T] = rule.message;
          isValid = false;
          break;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [validationRules, values]);

  const handleChange = useCallback(
    (name: keyof T, value: T[keyof T]) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      validateField(name, value);
    },
    [validateField]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "An error occurred"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, onSubmit, validateForm]
  );

  return {
    values,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    submitError,
  };
}
