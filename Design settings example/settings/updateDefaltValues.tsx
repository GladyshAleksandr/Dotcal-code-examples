import prisma from 'lib/prisma'
import { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/nextjs'
import withApiWrapper from 'lib/backend/withApiWrapper'
import { withRouter } from 'lib/backend/withRouter'
import { ExtendRequestSession, sessionMiddleware } from 'lib/backend/middlewares/sessionMiddleware'
import { BookingPageKind, BookingTheme } from '@prisma/client'
import { BookingThemePalette } from 'lib/backend/db/types'

async function handler(req: NextApiRequest & ExtendRequestSession, res: NextApiResponse) {
  await withRouter({
    req,
    res,
    patchRoute: {
      controller: patchUpdateDefaultValues,
      middlewares: [sessionMiddleware],
    },
  })
}

interface IBody {
  templateId: number
  palette: BookingThemePalette
  bookingThemeId?: number
  updateExistingBookingPages?: boolean
}

const patchUpdateDefaultValues = async (
  req: NextApiRequest & ExtendRequestSession,
  res: NextApiResponse
) => {
  const {
    templateId,
    palette,
    bookingThemeId,
    updateExistingBookingPages: isUpdateExisting,
  } = req.body as IBody

  const user = req.session.user

  try {
    const updateDefaultTemplate = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        defaultTemplateId: templateId,
      },
    })

    let customGlobalTheme: BookingTheme

    if (bookingThemeId && bookingThemeId > 0) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          bookingThemeId,
        },
      })
    } else if (palette) {
      customGlobalTheme = await prisma.bookingTheme.create({
        data: {
          templateId,
          palette,
          isBase: false,
          priority: 1000,
          title: 'Custom Global',
        },
      })

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          bookingThemeId: customGlobalTheme.id,
        },
      })
    }

    if (isUpdateExisting) {
      await updateExistingBookingPages(user.id, customGlobalTheme, templateId, bookingThemeId)
    }

    res
      .status(200)
      .json({ message: 'Global booking themes and initial booking pages successfully updated' })
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
    res.status(500).json({ message: err.message })
  }
}

const updateExistingBookingPages = async (
  userId: string,
  globalTheme: BookingTheme,
  templateId: number,
  baseThemeId: number
) => {
  const bookingPages = await prisma.eventType.findMany({
    where: {
      userId: userId,
      kind: BookingPageKind.personal,
    },
    orderBy: {
      id: 'asc',
    },
  })

  const initialBookingPagesIds = bookingPages.slice(0, 3).map((x) => x.id)

  if (globalTheme?.id) {
    await prisma.$transaction(
      initialBookingPagesIds.map((bookingPageId) =>
        prisma.bookingTheme.create({
          data: {
            templateId: globalTheme.templateId,
            palette: globalTheme.palette,
            isBase: false,
            priority: 100,
            eventTypeId: bookingPageId,
            title: 'Custom',
          },
        })
      )
    )
  } else if (baseThemeId) {
    await prisma.bookingTheme.deleteMany({
      where: {
        title: 'Custom',
        isBase: false,
        eventTypeId: {
          in: initialBookingPagesIds,
        },
      },
    })
    await prisma.eventType.updateMany({
      where: {
        id: {
          in: initialBookingPagesIds,
        },
      },
      data: {
        templateId,
        baseThemeId,
      },
    })
  }
}

export default withApiWrapper(handler)
