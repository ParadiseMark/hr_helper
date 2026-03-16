import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateCandidateDto } from './dto/create-candidate.dto'

@Injectable()
export class CandidatesService {
  constructor(private readonly prisma: PrismaService) {}

  create(createCandidateDto: CreateCandidateDto) {
    return this.prisma.candidate.create({
      data: createCandidateDto,
    })
  }

  findAll() {
    return this.prisma.candidate.findMany()
  }

  findOne(id: string) {
    return this.prisma.candidate.findUnique({
      where: { id },
    })
  }
}