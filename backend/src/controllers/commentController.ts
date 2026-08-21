import { Request, Response } from "express";
import * as commentService from "../services/commentService";

export async function addComment(req: Request, res: Response) {
  const comment = await commentService.addComment(req.params.id as string, req.user!, req.body.text);
  res.status(201).json({ success: true, data: { comment } });
}

export async function listComments(req: Request, res: Response) {
  const comments = await commentService.listComments(req.params.id as string, req.user!);
  res.status(200).json({ success: true, data: { comments } });
}
