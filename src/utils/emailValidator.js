import { z } from "zod";

export const emailValidator = (email) => {
  const valiator = z.object({
    email: z.string().email(),
  });

  try {
    email.trim();

    if (valiator.parse({ email })) {
      return true;
    }
  } catch (err) {
    return false;
  }
};
