export class ErrorResponse {

  constructor(
    public timestamp: Date,
    public status: number,
    public error: string,
    public message: string,
    public path: string
  ) { }
}