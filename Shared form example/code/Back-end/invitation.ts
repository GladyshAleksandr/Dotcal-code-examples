import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@src/lib/prisma'
import withApiWrapper from '@src/lib/backend/withApiWrapper'
import { ValidationError } from 'yup'
import { withRouter } from '@src/lib/backend/withRouter'
import { ExtendRequestSession, sessionMiddleware } from 'lib/backend/middlewares/sessionMiddleware'
import { formatErrorForUI } from 'lib/backend/utils/validation.utils'
import { teamMembersSchemaToCreate } from 'lib/backend/validations/teamMembers.validation'
import { createTeamMember } from 'lib/backend/repositories/teamMembers.repository'
import { sendInvitation } from 'lib/backend/services/team-members/sendInvitation'
import { TeamMemberType } from 'lib/common/constants/teamMembersType'
import { TeamMemberRole } from '@prisma/client'
import { TeamMemberRole as RoleNames } from 'lib/common/constants/teamMembers'

const handler = async (req: NextApiRequest & ExtendRequestSession, res: NextApiResponse) => {
  await withRouter({
    req,
    res,
    postRoute: {
      controller: postTeamMembersAction,
      middlewares: [sessionMiddleware],
    },
  })
}

const postTeamMembersAction = async (
  req: NextApiRequest & ExtendRequestSession,
  res: NextApiResponse
) => {
  const { teamId, emails, roleName, personalNote } = req.body

  const inviterName = req.session.user.name
  const inviterUserId = req.session.user.id

  try {
    await teamMembersSchemaToCreate.validate(req.body)

    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
      },
    })

    const licensedTeamMembers = await prisma.teamMember.findMany({
      where: {
        teamId,
        type: TeamMemberType.LICENSED,
      },
    })

    let availableNumberOfLicenses = team.numberOfSeats - licensedTeamMembers.length

    let memberRole: TeamMemberRole

    if (roleName === RoleNames.ADMIN) {
      memberRole = await prisma.teamMemberRole.findUnique({
        where: {
          slug: RoleNames.ADMIN,
        },
      })
    } else {
      memberRole = await prisma.teamMemberRole.findUnique({
        where: {
          slug: RoleNames.MEMBER,
        },
      })
    }

    const promises = emails.map(async (email: string) => {
      const user = await prisma.user.findFirst({
        where: {
          email,
        },
      })

      const userId = user?.id

      const data = {
        invitedEmail: email,
        hasAccepted: false,
        teamId,
        roleId: memberRole.id,
        type: TeamMemberType.UNLICENSED,
        invitingUserId: inviterUserId,
      }
      let teamMember = await prisma.teamMember.findFirst({
        where: {
          AND: [
            {
              invitedEmail: email,
            },
            {
              teamId: teamId,
            },
          ],
        },
        select: {
          id: true,
          invitedEmail: true,
        },
      })

      if (!teamMember) teamMember = await createTeamMember({ ...data, userId })
      availableNumberOfLicenses -= 1

      sendInvitation(
        teamMember.id,
        teamMember.invitedEmail,
        inviterName,
        inviterUserId,
        team,
        personalNote
      )

      return teamMember
    })

    const createdTeamMembers = await Promise.all(promises)

    return res.status(200).json({
      message: 'Users have been invited successfully',
      createdTeamMembers: [...createdTeamMembers],
    })
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(422).json({ message: err.message, ...formatErrorForUI(err) })
    } else {
      return res.status(500).json({ message: err.message })
    }
  }
}

export default withApiWrapper(handler)
