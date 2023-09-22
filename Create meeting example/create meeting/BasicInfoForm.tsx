import ButtonNew from '@src/lib/ui/buttons/ButtonNew'
import InputWithLabel from '@src/lib/ui/inputs/InputWithLabel'
import SelectInput from '@src/lib/ui/inputs/SelectInput'
import TextField from '@src/lib/ui/inputs/TextField'
import React, { BaseSyntheticEvent, useContext, useEffect, useRef, useState } from 'react'
import { CreateBookingPageContext } from 'modules/bookingPages/create/ui/contexts/createBookingPageContext'
import LocationOptionButtons from 'modules/bookingPages/ui/components/molecules/LocationOptionButtons'
import lengthOptionsLong from '@src/lib/ui/constants/lengthOptionsLong'
import HorizontalDividerAdmin from '@src/lib/ui/layout/HorizontalDividerAdmin'
import { ApiClient } from '@src/lib/ui/api-client'
import Checkbox from '@src/lib/ui/inputs/Checkbox'
import { FormError } from '../../../../../../lib/ui/errors/FormError'
import classNames from '@src/lib/common/utils/classNames'
import { yupResolver } from '@hookform/resolvers/yup'
import { Controller, useForm } from 'react-hook-form'
import { bookingFormCreateSchema, IBookingCreateForm } from '../../validation/booking-page'
import { fillErrorStateFromResponse } from '../../../../../../lib/ui/errors/formatter'
import {
  BookingTypeListingAction,
  BookingTypeListingContext,
} from '../../../../ui/contexts/booking-type-listing.context'
import { useDispatch } from 'react-redux'
import sanitizeSlug from '@src/lib/common/utils/sanitizeSlug'
import { Transition } from '@headlessui/react'
import PreviewAndColor from './PreviewAndColor'
import { handleCoworkers } from 'modules/bookingPages/ui/utils/handleInvitedCalendars'
import * as Sentry from '@sentry/nextjs'
import { BookingPageKind, InvitedCalendar } from '@prisma/client'
import copyText from 'lib/ui/utils/copyText.util'
import { TabIndex } from 'modules/bookingPages/ui/constants/tabIndex.enum'
import { pluralize } from 'lib/utils'
import TextArea from 'lib/ui/inputs/TextArea'
import { IPaletteValidity } from 'pages/app/booking-pages/[id]'
import ConnectedUser from 'modules/common/types/ConnectedUser'
import { fetchOrganizers } from 'lib/utils/fetchOrganizers'

export const IS_LINK_COPIED = 'isLinkCopied'

const BasicInfoForm = () => {
  const {
    isLoading,
    setIsLoading,
    bookingPage,
    user,
    setIsFormDirty,
    formInvitedCalendars,
    formBookingPageConnections,
    resetCoworkers,
    selectedType,
    schedulingType,
    defaultTheme,
    setDashboardType,
    organizers,
    organizersToDelete,
    setOrganizersToDelete,
  } = useContext(CreateBookingPageContext)

  const { dispatch: bookingListPageDispatch } = useContext(BookingTypeListingContext)
  const reduxDispatch = useDispatch()
  const [isSlugTouched, setIsSlugTouched] = useState(false)

  let continueAfterSave = useRef<boolean>(false)
  const [paletteValidity, setPaletteValidity] = useState<IPaletteValidity>({
    primary: true,
    secondary: true,
    tertiary: true,
  })
  const usersToInvite = organizers.filter((user) => !user.isInvited && !user.isSuggestion).length

  const {
    handleSubmit,
    register,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty },
    control,
    reset,
  } = useForm<IBookingCreateForm>({
    resolver: yupResolver(bookingFormCreateSchema),
    mode: 'onChange',
    defaultValues: {
      isPublic: true,
      length: 30,
      title: '',
      slug: '',
    },
  })

  const storeBookingForm = async (data, event: BaseSyntheticEvent) => {
    setIsLoading(true)
    const submitter = (event.nativeEvent as any)?.submitter?.name
    const formData = watch()

    const payload = {
      ...bookingPage,
      ...formData,
      teamId:
        selectedType === BookingPageKind.teams
          ? user.teamMembers.find((el) => el.userId === user.id).team.id
          : null,
      kind: selectedType,
      schedulingType,
    }
    let connections = []

    ApiClient.BookingPages.create(payload)
      .then(async ({ createdEvent, createdCustomTheme }) => {
        // reset(formData)
        const invCalendars =
          formInvitedCalendars &&
          handleCoworkers(formInvitedCalendars, bookingPage.invitedCalendars, createdEvent.id)

        if (invCalendars) {
          if (invCalendars.itemsToCreate.length)
            ApiClient.InvitedCalendars.add(createdEvent.id, invCalendars.itemsToCreate)
          if (invCalendars.itemsToDeleteIds.length)
            ApiClient.InvitedCalendars.destroy(createdEvent.id, invCalendars.itemsToDeleteIds)
        }
        const arr = organizers.map((el) => ({
          ...el,
          role: user?.teamMembers?.find((el) => el.userId === user.id)?.role || null,
          teamId: user?.teamMembers?.find((el) => el.userId === user.id)?.team?.id || null,
        }))

        await fetchOrganizers(user?.id, arr, organizersToDelete, createdEvent.id, true)
        setOrganizersToDelete([])

        const createdInvitedCalendars: Omit<InvitedCalendar, 'id' | 'eventTypeId'>[] = (
          invCalendars?.itemsToCreate || []
        ).map((ic: Omit<InvitedCalendar, 'id' | 'eventTypeId'>) => ({
          ...ic,
          eventTypeId: createdEvent.id,
        }))

        let dashboardType: TabIndex

        switch (selectedType) {
          case BookingPageKind.shared:
            dashboardType = TabIndex.SHARED
            break
          case BookingPageKind.teams:
            dashboardType = TabIndex.TEAM
            break
          default:
            dashboardType = TabIndex.PERSONAL
        }

        setDashboardType(dashboardType)
        localStorage.setItem('dc-dashboard-tab-index', selectedType)
        localStorage.setItem(IS_LINK_COPIED, 'true')

        const bp = { ...createdEvent }
        if (!bp.bookingPageConnections || !bp.bookingPageConnections.length)
          bp['bookingPageConnections'] = connections
        if (!bp.invitedCalendars || !bp.invitedCalendars.length)
          bp['invitedCalendars'] = createdInvitedCalendars

        const ct = createdCustomTheme
        if (submitter === 'submit-continue' || continueAfterSave.current) {
          window.location.href = `/app/booking-pages/${bp.id}`
        } else {
          bookingListPageDispatch({
            type: BookingTypeListingAction.AddBookingPageType,
            payload: bp,
          })
          bookingListPageDispatch({
            type: BookingTypeListingAction.AddCustomTheme,
            payload: { bookingPageId: bp.id, theme: ct },
          })
        }
      })
      .catch((err) => {
        fillErrorStateFromResponse(err, setError, true)
      })
      .finally(() => {
        resetCoworkers()

        if (submitter !== 'submit-continue' || !continueAfterSave.current) setIsLoading(false)
      })
  }

  const handleUrlPrefix = () =>
    selectedType === BookingPageKind.teams
      ? user.teamMembers.find((el) => el.userId === user.id).team.slug
      : user.username

  useEffect(() => {
    setIsFormDirty(isDirty)
  }, [isDirty])

  useEffect(() => {
    reset(watch())
    return setIsLoading(false)
  }, [])

  const ButtonsSection = () => {
    return (
      <>
        <div className='-mb-14'>
          <FormError
            error={
              Object.keys(errors).length
                ? 'Please fix the above errors to save this booking page'
                : null
            }
          />
        </div>

        <div className='mt-16 flex flex-row items-center space-x-12'>
          <ButtonNew
            name='submit-save-info'
            id='submit-save-info'
            className='w-48 font-medium'
            onClick={() => {
              continueAfterSave.current = false
              handleSubmit(storeBookingForm)
              copyText(location.host + '/' + handleUrlPrefix() + '/' + getValues().slug)
            }}
            size='large'
            disabled={
              Boolean(Object.keys(errors).length) ||
              isLoading ||
              !Object.values(paletteValidity).every((elem) => elem === true)
            }
          >
            {usersToInvite > 0
              ? `Save & invite ${usersToInvite} ${pluralize('user', usersToInvite)}`
              : 'Save'}
          </ButtonNew>
          <button
            type='submit'
            name='submit-continue'
            className={classNames(
              'transition-opacity duration-300 underline font-medium cursor-pointer',
              (Object.keys(errors).length || isLoading) && 'opacity-20 pointer-events-none'
            )}
            onClick={() => {
              continueAfterSave.current = true
              handleSubmit(storeBookingForm)
              copyText(location.host + '/' + handleUrlPrefix() + '/' + getValues().slug)
            }}
          >
            {usersToInvite > 0
              ? `Invite ${usersToInvite} ${pluralize('user', usersToInvite)} and customize`
              : 'Continue customizing'}
          </button>
        </div>
      </>
    )
  }

  return (
    <div className='pb-12'>
      {/* Form */}
      <form onSubmit={handleSubmit(storeBookingForm)}>
        <div className='relative flex flex-col lg:flex-row justify-items-start lg:justify-center mx-auto w-full max-w-5xl space-x-0 lg:space-x-16 lg:space-y-0 space-y-8'>
          <div className='basis-3/4'>
            {/* Header */}
            <div className='mb-6 space-y-2'>
              <p className='font-bold text-4xl font-manrope mt-4'>Finish Up</p>
              <p>Just a few more details before we can go live with your booking page</p>
            </div>

            <InputWithLabel
              testId='meetingLabel'
              label='Meeting name'
              errorText={errors?.title?.message}
            >
              <Controller
                control={control}
                name='title'
                render={({ field: { onChange, value, name } }) => (
                  <TextField
                    id='title'
                    testId='meeting-input'
                    isError={Boolean(errors?.title)}
                    realValue={value}
                    className='max-w-[25rem]'
                    onChange={(e) => {
                      setValue('title', e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })

                      if (!isSlugTouched) {
                        setValue('slug', sanitizeSlug(e.target.value), {
                          shouldValidate: true,
                          shouldDirty: true,
                        })
                      }
                    }}
                  />
                )}
              />
            </InputWithLabel>

            <InputWithLabel testId='urlLabel' label='URL' errorText={errors?.slug?.message}>
              <Controller
                control={control}
                name='slug'
                render={({ field: { onChange, value, name } }) => (
                  <div className='flex rounded-md max-w-[25rem]'>
                    <div className='px-5 text-gray-400 bg-gray-75 text-md rounded-l-lg border-r flex items-center border-gray-200 max-w-[144px]'>
                      <p className='truncate'>{`dotcal.co/${handleUrlPrefix()}/`}</p>
                    </div>
                    <TextField
                      testId='url-input'
                      isError={Boolean(errors?.slug)}
                      className='rounded-l-none'
                      id='slug'
                      full
                      realValue={value}
                      onChange={(e) => {
                        if (!isSlugTouched) setIsSlugTouched(true)
                        onChange(sanitizeSlug(e.target.value))
                      }}
                    />
                  </div>
                )}
              />
            </InputWithLabel>

            <InputWithLabel label='Description' errorText={errors?.description?.message}>
              <TextArea
                id='description'
                isError={Boolean(errors?.description)}
                register={register}
                className='max-w-[25rem]'
              />
            </InputWithLabel>

            <InputWithLabel label='Length' errorText={errors?.length?.message}>
              <Controller
                control={control}
                name='length'
                render={({ field: { onChange, value, name }, formState: { errors: err } }) => (
                  <SelectInput
                    invalid={Boolean(err?.length)}
                    options={lengthOptionsLong}
                    selectedOption={lengthOptionsLong.find((o) => o.value === value)}
                    setSelectedOption={(option) => onChange(option.value)}
                    name={name}
                  />
                )}
              />
            </InputWithLabel>

            <div className='max-w-lg mt-5'>
              <Controller
                control={control}
                name='isPublic'
                render={({ field: { onChange, value } }) => (
                  <Checkbox
                    name='isPublic'
                    title='Private'
                    description='Marking as private will hide this booking page on your profile page. You can still share the direct link to invite people to book.'
                    onChange={(e) => onChange(!e.target.checked)}
                    checked={!value}
                  />
                )}
              />
            </div>

            <HorizontalDividerAdmin className='w-64 my-8' />

            <div className=''>
              <p className='input-label'>Meeting Format</p>
              <p className='text-sm text-gray-500 mb-5 max-w-lg'>
                Choose how people can join this meeting. Selecting multiple formats will allow your
                guests to pick which option works best for them when they book.
              </p>
              <Controller
                control={control}
                name='locations'
                render={({ field: { onChange, value } }) => (
                  <LocationOptionButtons
                    user={user}
                    initialLocations={value || []}
                    onChange={(locations) => onChange(locations)}
                    errorMessage={(errors?.locations as any)?.message}
                  />
                )}
              />
            </div>

            <div className='hidden lg:inline'>
              <ButtonsSection />
            </div>
          </div>

          {/* Preview + Design section */}
          <Transition as='div' className='basis-1/4' enter=''>
            <PreviewAndColor setPaletteValidity={setPaletteValidity} />
          </Transition>
          <div className='lg:hidden'>
            <ButtonsSection />
          </div>
        </div>
      </form>
    </div>
  )
}

export default BasicInfoForm
