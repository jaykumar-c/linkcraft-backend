import {
  IsArray,
  ValidateNested,
  IsNumber,
  IsString,
  Min,
  IsNotEmpty,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

export class ReorderLinkItemDto {
  @IsString()
  @IsNotEmpty()
  linkId: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}

export class ReorderLinksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderLinkItemDto)
  links: ReorderLinkItemDto[];
}
