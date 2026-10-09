"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, getSession } from "next-auth/react";
import { AlertCircle } from "lucide-react";

import { loginSchema, type LoginFormData } from "@/lib/schemas/login";
import { FormField } from "@/components/core/FormField";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/core/PasswordInput";
import { PrimaryButton } from "@/components/core/PrimaryButton";
import { getAuthErrorMessage } from "@/lib/messages";
import { homePathFor } from "@/lib/permissions";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");

  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isPending, setIsPending] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsPending(true);

    try {
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (res?.error) {
        const errorCode = res.code || res.error;
        setServerError(getAuthErrorMessage(errorCode));
        setValue("password", "");
        return;
      }

      // Check the session to determine destination
      const session = await getSession();
      const role = session?.user?.role;

      let destination: string;
      if (
        rawCallbackUrl &&
        rawCallbackUrl.startsWith("/") &&
        !rawCallbackUrl.startsWith("//")
      ) {
        destination = rawCallbackUrl;
      } else {
        destination = homePathFor(role);
      }

      router.replace(destination);
      router.refresh();
    } catch (err: unknown) {
      let code: string | null = null;
      if (err && typeof err === "object") {
        if ("code" in err && typeof err.code === "string") {
          code = err.code;
        } else if ("type" in err && typeof err.type === "string") {
          code = err.type;
        }
      }
      setServerError(getAuthErrorMessage(code || "server_error"));
      setValue("password", "");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span className="font-medium">{serverError}</span>
        </div>
      )}

      <FormField
        label="Email"
        htmlFor="login-email"
        required
        error={errors.email?.message}
      >
        <Input
          id="login-email"
          type="email"
          autoFocus
          autoComplete="username"
          placeholder="name@example.com"
          disabled={isPending}
          {...register("email")}
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="login-password"
        required
        error={errors.password?.message}
      >
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          placeholder="Enter your password"
          disabled={isPending}
          {...register("password")}
        />
      </FormField>

      <PrimaryButton
        type="submit"
        loading={isPending}
        className="w-full mt-2"
        size="lg"
      >
        Sign in
      </PrimaryButton>
    </form>
  );
}
