export async function respToBuffer(r: Response): Promise<Buffer> {
  return r.arrayBuffer().then(Buffer.from)
}
