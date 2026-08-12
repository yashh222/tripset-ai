import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export const hashPassword = async (plainPassword) => {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return await bcrypt.hash(plainPassword, salt);
};

export const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};
