import { IsString } from "class-validator";

export class LinkDetailsQueryDto {
  @IsString()
  linkId: string;
}
