import { currentUserFrom } from 'lib/backend/repositories/user.repository'
import sidebarCalendarsForUser from 'lib/sidebarCalendarsForUser'
import setReduxCalendarsStateAction from 'lib/utils/redux.hydrateCalendarsState'
import setReduxUserStateAction from 'lib/utils/redux.hydrateUserState'
import PaletteClass, { PaletteType } from 'modules/common/ui/PaletteClass/PaletteClass'
import { getSession } from 'next-auth/react'
import { useCallback, useContext, useEffect, useState } from 'react'
import { connect } from 'react-redux'
import { wrapper } from 'redux/store'
import prisma from '@src/lib/prisma'
import { BookingTheme, User } from '@prisma/client'
import getSavedThemeFrom from 'modules/bookingPages/ui/utils/getSavedThemeFor'
import { Template } from 'modules/eventTypes/ui/components/atoms/Template'
import { IPaletteValidity } from '../booking-pages/[id]'
import SettingsShell from '@components/Settings'
import ButtonNew from 'lib/ui/buttons/ButtonNew'
import Head from 'next/head'
import AdminShell from 'lib/ui/shells/AdminShell/AdminShell'
import TemplatePreview from 'modules/bookingPages/ui/components/molecules/TemplatePreview'
import { BookingThemeExtended, BookingThemePalette } from 'lib/backend/db/types'
import { sBookingTemplateExtended } from 'modules/common/types/BookingTemplate'
import { byPriority } from 'modules/common/utils/byPriority'
import { BookingTemplateExtended } from 'modules/eventTypes/ui/components/BookingPageCard'
import { ApiClient } from 'lib/ui/api-client'
import TemplateKeys from 'lib/common/constants/TemplateKeys'
import Modal from '@components/Modal'
import useExitPrompt from 'modules/common/customHooks/useExitPrompt'
import router from 'next/router'
import { getDefaultTheme } from 'modules/eventTypes/services/template.service'
import { GLOBAL_PALETTE_PRIORITY } from 'modules/bookingPages/create/ui/components/molecules/PreviewAndColor'
import sidebarIntegrationsForUser from 'lib/sidebarIntegrationsForUser'
import setReduxIntegrationsStateAction from 'lib/utils/redux.hydrateIntegrationsState'
import { ImageTypeInDb } from 'lib/common/constants/ImageTypeInDb'
import { ImageUpload } from 'modules/team/ui/components/molecules/ImageUpload'
import { DeleteImage } from 'modules/team/ui/components/molecules/DeleteImage'
import { NotificationContext } from 'modules/contexts/NotificationContext'
import { NotificationType } from 'redux/notifications/actions/notification.actions'
import { Switch } from '@headlessui/react'
import Toggle from '@components/ui/Toggle'

function Design({ user, templates, firstBookingPage, defaultTheme }) {
  const { triggerNotification } = useContext(NotificationContext)

  const [userState, setUserState] = useState<User>(user)
  const [is24h, setIs24h] = useState<boolean>(userState.isDefault24h)
  const profileSaved = () => {
    !unSavedChanges && triggerNotification('Profile Saved!', '', NotificationType.Success, 3500)
  }

  const [errorMessage, setErrorMessage] = useState('')

  const [selectedTemplate, setSelectedTemplate] = useState(
    templates.find((t: BookingTemplateExtended) =>
      user.defaultTemplateId
        ? t.id === user.defaultTemplateId
        : t.key === TemplateKeys.DefaultTemplate
    ) as BookingTemplateExtended
  )

  const baseThemes = selectedTemplate.themes.filter((t) => t.isBase)
  const [currentThemes, setThemes] = useState<BookingTheme[]>(baseThemes)
  const [selectedTheme, setSelectedTheme] = useState<BookingTheme>(
    user.bookingThemeId ? defaultTheme : baseThemes.sort(byPriority)[0]
  )
  const [currentPalette, setCurrentPalette] = useState<PaletteType>({
    primary: '',
    secondary: '',
    tertiary: '',
  })

  const onPaletteOverride = useCallback(
    (override: Record<string, string>) => {
      const value = {
        ...currentPalette,
        ...override,
      }

      setCurrentPalette(value)

      const newTheme: BookingTheme = {
        ...selectedTheme,
        id: -1,
        isBase: false,
        palette: value,
      }
      setSelectedTheme(newTheme)
      setThemes([...selectedTemplate.themes.filter((t) => t.isBase), newTheme])
    },
    [selectedTheme, currentPalette, currentThemes]
  )

  useEffect(() => {
    if (!selectedTheme) return

    setCurrentPalette(selectedTheme.palette as any)
  }, [selectedTheme])

  useEffect(() => {
    if (selectedTemplate.themes.find((t) => t.priority === GLOBAL_PALETTE_PRIORITY)) {
      setSelectedTemplate((prevState) => ({
        ...prevState,
        themes: prevState.themes.filter((t) => t.priority !== GLOBAL_PALETTE_PRIORITY),
      }))
    }

    const themes = ((selectedTemplate as any).themes as BookingTheme[])
      .filter((t) => t.isBase)
      .sort((a, b) => a.priority - b.priority)

    setThemes(themes)

    let theme = themes.find((x) => !x.isBase)
    if (!theme) {
      theme = themes.find((x) => x.id === bookingPage.baseThemeId)
    }
    if (!theme) {
      theme = themes[0]
    }
    setSelectedTheme(user.bookingThemeId ? defaultTheme : theme)
  }, [selectedTemplate])

  const [bookingPage, setBookingPage] = useState(firstBookingPage)
  const [savedTheme, setSavedTheme] = useState<BookingTheme>(
    user.bookingThemeId ? defaultTheme : getSavedThemeFrom(bookingPage, selectedTemplate.themes)
  )
  const [unSavedChanges, setUnSavedChanges] = useState<boolean>(false)
  useEffect(() => {
    if (selectedTemplate.id === user.defaultTemplateId && selectedTheme.id === savedTheme.id) {
      setUnSavedChanges(false)
      return
    }
    setUnSavedChanges(true)
  }, [selectedTemplate, selectedTheme])

  useEffect(() => {
    if (is24h === userState.isDefault24h) {
      setUnSavedChanges(false)
      return
    }
    setUnSavedChanges(true)
  }, [is24h])

  const [paletteValidity, setPaletteValidity] = useState<IPaletteValidity>({
    primary: true,
    secondary: true,
    tertiary: true,
  })

  const updateTemplate = async () => {
    if (selectedTemplate.id !== user.defaultTemplateId || selectedTheme.id !== savedTheme.id) {
      await ApiClient.BookingPages.updateDefaultValues(
        selectedTemplate.id,
        selectedTheme.palette as BookingThemePalette,
        selectedTheme.id
      )

      if (selectedTheme.isBase && currentThemes.find((t) => !t.isBase)) {
        const onlyTemplateThemes = [...selectedTemplate.themes].filter((t) => t.isBase)
        setThemes(onlyTemplateThemes)
      }

      setBookingPage({
        ...bookingPage,
        templateId: selectedTemplate.id,
        baseThemeId: selectedTheme.id,
      })
      setSavedTheme(selectedTheme)
    }

    const updatedUser = await ApiClient.User.update({ isDefault24h: is24h }).catch((err) => {
      triggerNotification('Uh-Oh! There was a problem: ' + err, '', NotificationType.Error, 3500)
    })

    triggerNotification('Profile Saved!', '', NotificationType.Success, 3500)
    setUserState(updatedUser)
    setUnSavedChanges(false)
  }

  const [unsavedModalOpen, setUnsavedModalOpen] = useState(false)
  const [unsavedModalDestination, setUnsavedModalDestination] = useState('/app/booking-pages')
  const [, setShowExitPrompt] = useExitPrompt(false)
  // Catching all possible ways of leaving a page
  useEffect(() => {
    // Reloading/closing tab
    setShowExitPrompt(unSavedChanges)

    // Browser back btn
    router.beforePopState(({ as }) => {
      if (as !== router.asPath && unSavedChanges) {
        setUnsavedModalOpen(true)
        setUnsavedModalDestination('/app/booking-pages')
      } else {
        return true
      }
    })

    const handleRouteChange = (url: React.SetStateAction<string>, { shallow }: any) => {
      if (unSavedChanges && shallow) {
        router.events.emit('routeChangeError')
        setUnsavedModalOpen(true)
        setUnsavedModalDestination(url)
        throw 'Abort route change. Please ignore this error.'
      }
    }

    // Page buttons
    router.events.on('routeChangeStart', handleRouteChange)

    return () => {
      router.beforePopState(() => true)
      router.events.off('routeChangeStart', handleRouteChange)
    }
  }, [unSavedChanges])

  return (
    <AdminShell page='settings/design' heading='Settings'>
      <Head>
        <title>Design • Dotcal</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <SettingsShell page='design'>
        <div className='flex flex-col mt-10 justify-center'>
          <div className='flex flex-col mdlg:flex-row justify-between'>
            <div className='w-full mdlg:w-1/2'>
              <p className='font-semibold text-sm -mt-1 mb-3.5'>Choose a default template</p>
              <div className='grid grid-cols-3'>
                <div className='col-span-3'>
                  <div className='flex flex-row w-full overflow-x-auto show-scrollbar pb-5'>
                    {templates.map((t) => (
                      <Template
                        key={t.key}
                        template={t}
                        selectedTemplate={selectedTemplate}
                        setSelectedTemplate={setSelectedTemplate}
                        forSettings={true}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className='font-semibold text-sm mb-3.5'>
                Choose a default theme, or make your own
              </p>
              <PaletteClass
                savedTheme={savedTheme}
                currentPalette={currentPalette}
                currentThemes={currentThemes}
                setSelectedTheme={setSelectedTheme}
                selectedTheme={selectedTheme}
                setPaletteValidity={setPaletteValidity}
                onPaletteOverride={onPaletteOverride}
                defaultTheme={user.bookingThemeId && defaultTheme}
                showGlobalTheme={true}
              />
            </div>
            <div className='relative w-96 h-64 border-white border-4 rounded-xl shadow-xl'>
              <TemplatePreview
                user={user}
                bookingPage={bookingPage}
                template={selectedTemplate as unknown as sBookingTemplateExtended}
                theme={selectedTheme as BookingThemeExtended}
              />
            </div>
          </div>
          <div className='mb-6 self-start lg:mt-0 lg:ml-6 lg:flex-grow-0 lg:flex-shrink-0 flex xxs:flex-col xxs:mt-4 xxs:items-center xs:flex-row justify-around w-full lg:flex-row lg:w-full'>
            <div className='xxs:mt-4 xs:mt-0 lg:mt-4 relative'>
              <label className='input-label inline-block mb-2' aria-hidden='true'>
                Photo
              </label>
              <DeleteImage
                user={userState}
                setUser={setUserState}
                imageType={ImageTypeInDb.UserImage}
                setErrorMessage={setErrorMessage}
                showSavedNotification={profileSaved}
              />
              <ImageUpload
                user={userState}
                imageType={ImageTypeInDb.UserImage}
                setUser={setUserState}
                showSavedNotification={profileSaved}
                setErrorMessage={setErrorMessage}
              />
            </div>
            <div className='xxs:mt-4 xs:mt-0 lg:mt-4 relative'>
              <label className='input-label inline-block mb-2' aria-hidden='true'>
                Company Logo
              </label>
              <DeleteImage
                user={userState}
                setUser={setUserState}
                imageType={ImageTypeInDb.CompanyLogo}
                setErrorMessage={setErrorMessage}
                showSavedNotification={profileSaved}
              />
              <ImageUpload
                user={userState}
                imageType={ImageTypeInDb.CompanyLogo}
                setUser={setUserState}
                showSavedNotification={profileSaved}
                setErrorMessage={setErrorMessage}
              />
            </div>
          </div>
          <hr className='mt-4' />
          <div className='flex mt-4'>
            <div className='flex items-center w-1/2 font-medium'>Select your time format</div>
            <div className='w-1/2 '>
              <Switch.Group as='div' className='flex items-center justify-end'>
                <Switch.Label as='span' className='mr-3'>
                  <span className='text-sm'>am/pm</span>
                </Switch.Label>
                <Toggle value={is24h} setValue={setIs24h} className='mt-2 ' />

                <Switch.Label as='span' className='ml-3'>
                  <span className='text-sm'>24h</span>
                </Switch.Label>
              </Switch.Group>
            </div>
          </div>
          <hr className='mt-4' />
          <div className='pt-4 flex justify-end'>
            <ButtonNew
              onClick={updateTemplate}
              disabled={
                !Object.values(paletteValidity).every((elem) => elem === true) || !unSavedChanges
              }
              type='submit'
              color='black'
              className='w-24'
            >
              Save
            </ButtonNew>
          </div>
        </div>

        <Modal
          heading='Unsaved changes'
          description={
            'You have unsaved changes that will be lost if you leave this page. Finish editing and hit save to keep your changes.'
          }
          open={unsavedModalOpen}
          confirmMessage='Discard changes'
          dismissMessage='Finish editing'
          handleClose={() => setUnsavedModalOpen(false)}
          handleConfirm={() => {
            setShowExitPrompt(false)
            router.push(unsavedModalDestination)
          }}
        />
      </SettingsShell>
    </AdminShell>
  )
}

export const getServerSideProps = wrapper.getServerSideProps((store) => {
  return async (context) => {
    const session = await getSession(context)

    if (!session) {
      return { redirect: { permanent: false, destination: '/auth/login' } }
    }

    const user = await currentUserFrom(session)
    const templates = await prisma.bookingTemplate.findMany({
      where: {
        AND: [
          {
            publishedAt: {
              not: null,
            },
          },
          {
            publishedAt: {
              lt: new Date(),
            },
          },
        ],
      },
      select: {
        id: true,
        key: true,
        name: true,
        previewImg: true,
        description: true,
        themes: true,
      },
    })

    const themes = await prisma.bookingTheme.findMany({
      where: {
        palette: {
          not: undefined,
        },
      },
      select: {
        id: true,
        title: true,
        isBase: true,
        palette: true,
      },
    })
    const type = await prisma.eventType.findUnique({
      where: {
        id: 1,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        inviteTitle: true,
        slug: true,
        description: true,
        kind: true,
        schedulingType: true,
        length: true,
        eventBufferBefore: true,
        eventBufferAfter: true,
        redirectUrl: true,
        isPublic: true,
        isActive: true,
        locations: true,
        color: true,
        includeManageLink: true,
        customQuestions: true,
        invitedCalendars: true,
        calendarId: true,
        availableUntil: true,
        leadTime: true,
        reminders: true,
        bookingPageConnections: {
          select: {
            id: true,
            eventTypeId: true,
            connectionId: true,
            teamMemberId: true,
            connection: {
              select: {
                id: true,
                invitedEmail: true,
                hasAccepted: true,
                invitedUserId: true,
                invitedUser: {
                  select: {
                    username: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        templateId: true,
        baseThemeId: true,
        eventImage: true,
        availabilityWindowId: true,
        bookingPayment: {
          select: {
            id: true,
            amountInCents: true,
            provider: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
        teamId: true,
        team: true,
      },
    })

    const defaultTheme = await getDefaultTheme(user.bookingThemeId)

    if (!session) {
      return { redirect: { permanent: false, destination: '/auth/login' } }
    }

    const calendars = await sidebarCalendarsForUser(user.id)

    setReduxCalendarsStateAction(store, calendars)
    setReduxUserStateAction(store, user)

    const userIntegrations = await sidebarIntegrationsForUser(user.id)
    setReduxIntegrationsStateAction(store, userIntegrations)

    return {
      props: {
        user,
        templates,
        themes,
        firstBookingPage: type,
        defaultTheme,
      },
    }
  }
})

export default connect((state) => state)(Design)
