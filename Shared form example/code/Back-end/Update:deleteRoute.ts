import type { NextApiRequest, NextApiResponse } from 'next'

import { ExtendRequestSession, sessionMiddleware } from 'lib/backend/middlewares/sessionMiddleware'
import prisma from '@src/lib/prisma'
import withApiWrapper from '@src/lib/backend/withApiWrapper'
import { withRouter } from '@src/lib/backend/withRouter'
import { ValidationError } from 'yup'
import { formatErrorForUI } from '@src/lib/backend/utils/validation.utils'
import { teamMemberSchemaToUpdate } from 'lib/backend/validations/teamMembers.validation'
import { deleteTeamMember, updateTeamMember } from 'lib/backend/repositories/teamMembers.repository'

async function handler(req: NextApiRequest & ExtendRequestSession, res: NextApiResponse) {
  await withRouter({
    req,
    res,
    patchRoute: {
      controller: patchTeamMemberAction,
      middlewares: [sessionMiddleware],
    },
    deleteRoute: {
      controller: deleteTeamMembersAction,
      middlewares: [sessionMiddleware],
    },
  })
}

const patchTeamMemberAction = async (
  req: NextApiRequest & ExtendRequestSession,
  res: NextApiResponse
) => {
  try {
    await teamMemberSchemaToUpdate.validate(req.body)

    const role = await prisma.teamMemberRole.findUnique({
      where: {
        slug: req.body.roleSlug,
      },
    })

    const type = req.body.type

    const updatedTeamMember = await updateTeamMember(String(req.query.id), {
      roleId: role.id,
      type: type,
    })

    return res.status(200).json({
      message: 'Team member updated successfully',
      updatedTeamMember,
    })
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(422).json({ message: err.message, ...formatErrorForUI(err) })
    } else {
      return res.status(500).json({ message: err.message })
    }
  }
}

const deleteTeamMembersAction = async (
  req: NextApiRequest & ExtendRequestSession,
  res: NextApiResponse
) => {
  try {
    const deletedTeamMember = await deleteTeamMember(String(req.query.id))

    return res.status(200).json({
      message: 'Team member deleted successfully',
      deletedTeamMember,
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
