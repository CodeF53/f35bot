export async function respToBuffer(r: Response): Promise<Buffer> {
  return r.arrayBuffer().then(Buffer.from)
}

export function bytesToMB(bytes: number): string {
  return `${Math.round(bytes * 1e-6)}mb`
}
