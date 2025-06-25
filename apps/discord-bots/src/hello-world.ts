import { Request, Response } from "express";

export const handler = async (req: Request, res: Response) => {
  res.send("Hello, World!");
};
