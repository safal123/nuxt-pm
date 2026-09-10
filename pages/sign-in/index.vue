<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import * as z from "zod";
import { toast } from "vue-sonner";
import { authClient } from "~/lib/auth-client";

useHead({ title: "Sign in — Northstar" });

const route = useRoute();
const { fetchSession } = useAuth();

const redirectUrl = computed(() =>
  typeof route.query.redirect_url === "string" ? route.query.redirect_url : "/w",
);

const submitting = ref(false);

const formSchema = toTypedSchema(
  z.object({
    email: z
      .string()
      .trim()
      .min(1, "Email is required")
      .email("Enter a valid email"),
    password: z.string().min(1, "Password is required"),
  }),
);

async function onSubmit(values: any) {
  if (submitting.value) return;
  submitting.value = true;

  const { error } = await authClient.signIn.email({
    email: values.email.trim(),
    password: values.password,
  });

  if (error) {
    submitting.value = false;
    toast.error(error.message || "Those credentials did not match our records");
    return;
  }

  await fetchSession();
  await navigateTo(redirectUrl.value);
}

async function continueWithGoogle() {
  submitting.value = true;
  const { error } = await authClient.signIn.social({
    provider: "google",
    callbackURL: redirectUrl.value,
    errorCallbackURL: "/sign-in",
  });
  if (error) {
    submitting.value = false;
    toast.error(error.message || "Could not reach Google");
  }
}
</script>

<template>
  <AuthShell
    title="Welcome back"
    subtitle="Sign in to your workspace to pick up boards, activity, and email."
  >
    <div class="space-y-5">
      <GoogleButton
        label="Continue with Google"
        :disabled="submitting"
        @click="continueWithGoogle"
      />
      <AuthDivider />

      <Form v-slot="{ handleSubmit }" as="" :validation-schema="formSchema">
        <form class="space-y-4" @submit="handleSubmit($event, onSubmit)">
          <FormField v-slot="{ componentField }" name="email">
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  class="h-11"
                  autocomplete="email"
                  placeholder="you@company.com"
                  v-bind="componentField"
                  :disabled="submitting"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FormField v-slot="{ componentField }" name="password">
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  class="h-11"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  v-bind="componentField"
                  :disabled="submitting"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <Button type="submit" size="lg" class="h-11 w-full" :disabled="submitting">
            {{ submitting ? "Signing in…" : "Sign in" }}
          </Button>
        </form>
      </Form>

      <p class="text-center text-sm text-muted-foreground">
        Don't have an account?
        <NuxtLink
          :to="{ path: '/sign-up', query: route.query }"
          class="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create one
        </NuxtLink>
      </p>
    </div>
  </AuthShell>
</template>
