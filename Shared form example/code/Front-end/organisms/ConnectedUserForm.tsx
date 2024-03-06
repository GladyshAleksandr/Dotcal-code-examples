import { BookingPageKind, EventType, InvitedCalendar } from '@prisma/client'
import Tags from '@yaireo/tagify/dist/react.tagify'
import { CurrentUserType } from 'lib/backend/repositories/user.repository'
import traces, { INVITE_METHODS } from 'lib/common/constants/traces.constant'
import classNames from 'lib/common/utils/classNames'
import { ApiClient } from 'lib/ui/api-client'
import HoverTip from 'lib/ui/popups/HoverTip'
import createTrace from 'lib/ui/tracking/createTrace'
import { ConnectionType } from 'modules/app/contacts/ui/List'
import { CreateBookingPageContext } from 'modules/bookingPages/create/ui/contexts/createBookingPageContext'
import { BookingPageContext } from 'modules/bookingPages/ui/utils/bookingPageContext'
import ConnectedUser, { ConnectedUserType } from 'modules/common/types/ConnectedUser'
import { NotificationContext } from 'modules/contexts/NotificationContext'
import { SuggestedUser } from 'modules/onboarding/AssignedFriends/SuggestionsList'
import { SchedulerContext } from 'modules/scheduler/SchedulerContext'
import { Dispatch, SetStateAction, useContext, useEffect, useRef, useState } from 'react'
import { Control, Controller } from 'react-hook-form'
import { NotificationType } from 'redux/notifications/actions/notification.actions'
import { getTagIcon } from '../../utils/coworkers'
import ConnectedUserListItem from '../atoms/ConnectedUserListItem'
import style from '../css/styles.module.css'

export interface IConnection {
  id: string
  invitedUserId: string | null
  inviteeUserId: string
  invitedEmail: string
  hasAccepted: boolean
  invitedUser: {
    name: string | null
    username: string | null
    email: string | null
  } | null
}

interface IConnectedUserDropdownProps {
  availableUsers: ConnectedUser[]
  setOrganizersToDelete: Dispatch<SetStateAction<ConnectedUser[]>>
  currentSection: any
  setCurrentSection: any
  overlappingConnections: Array<string>
  organizers: ConnectedUser[]
  setOrganizers: Dispatch<SetStateAction<ConnectedUser[]>>
  user: CurrentUserType
  isLoading: boolean
  handleTagTemplate: (tagData: any) => string
  control: Control<any, object>
  canEdit: boolean
  inviteUser: (email: string) => void
  setAvailableUsers: Dispatch<SetStateAction<ConnectedUser[]>>
  triggerNotification: (
    title: string,
    description: string,
    type: NotificationType,
    dismissAfter: number
  ) => void
  onDelete: (con: ConnectedUser) => void
  bookingMode: BookingMode
  isOpen: boolean
  setAddedExistedTag: (connectedUser: string) => void
}

export enum BookingMode {
  CREATE,
  QUICK_CREATE,
  EDIT,
}

interface ComponentProps {
  bookingMode: BookingMode
  overlappingConnections: any
}

const ConnectedUserForm = ({ bookingMode, overlappingConnections }: ComponentProps) => {
  const { triggerNotification } = useContext(NotificationContext)

  const tagsInput = useRef(null)

  const [isOpen, setIsOpen] = useState(false)
  const [filteredUsers, setFilteredUsers] = useState<ConnectedUser[]>([])
  const [filterInput, setFilterInput] = useState('')
  const [currentSection, setCurrentSection] = useState(ConnectedUserType.Connection)

  let user: CurrentUserType,
    bookingPage: Partial<EventType> & {
      bookingPageConnections?: any
      invitedCalendars: Partial<InvitedCalendar[]>
    },
    control: Control<any, object>,
    organizers: ConnectedUser[],
    setOrganizers: Dispatch<SetStateAction<ConnectedUser[]>>,
    setOrganizersToDelete: Dispatch<SetStateAction<ConnectedUser[]>>,
    suggestedUsers: SuggestedUser[],
    availableUsers: ConnectedUser[],
    setAvailableUsers: Dispatch<SetStateAction<ConnectedUser[]>>,
    isConnectionsLoading: boolean,
    selectedType: BookingPageKind,
    reloadUserConnection: () => void

  bookingMode === BookingMode.CREATE
    ? ({
        user,
        bookingPage,
        control,
        organizers,
        setOrganizers,
        setOrganizersToDelete,
        suggestedUsers,
        availableUsers,
        setAvailableUsers,
        isConnectionsLoading,
        selectedType,
      } = useContext(CreateBookingPageContext))
    : bookingMode === BookingMode.QUICK_CREATE
    ? ({
        user,
        control,
        organizers,
        setOrganizers,
        setOrganizersToDelete,
        suggestedUsers,
        availableUsers,
        setAvailableUsers,
        isConnectionsLoading,
        reloadUserConnection,
      } = useContext(SchedulerContext))
    : ({
        user,
        bookingPage,
        control,
        organizers,
        setOrganizers,
        setOrganizersToDelete,
        suggestedUsers,
        availableUsers,
        setAvailableUsers,
        isConnectionsLoading,
      } = useContext(BookingPageContext))

  const self = useRef({ availableUsers })

  const canEdit = bookingMode === BookingMode.EDIT ? bookingPage.userId === user.id : true

  useEffect(() => {
    localStorage.setItem('currentSection', currentSection)
  }, [])

  useEffect(() => {
    suggestedUsers.map((user) => inviteUser(user.email, true))
  }, [suggestedUsers])

  useEffect(() => {
    setFilteredUsers(
      availableUsers
        .sort((a, b) => Number(a.isSuggestion || 0) - Number(b.isSuggestion || 0))
        .filter((el) => el.id !== user.id)
    )

    self.current.availableUsers = availableUsers
  }, [availableUsers])

  useEffect(() => {
    onFilter(availableUsers, filterInput)
  }, [filterInput])

  const sortConnections = (a: ConnectedUser, b: ConnectedUser) => {
    let isSortingByAccepted = a.hasAccepted != b.hasAccepted
    const aDisplay = a.name || a.username || a.email || a.email
    const bDisplay = b.name || b.username || b.email || b.email

    return isSortingByAccepted ? 1 : 0 || aDisplay.localeCompare(bDisplay)
  }

  const onFilter = (users: ConnectedUser[], input: string) => {
    if (input === '' || input === null) {
      setFilteredUsers(users)
      return
    }

    const reg = new RegExp(input, 'i')

    setFilteredUsers(
      users
        .filter(
          (connectedUser) =>
            connectedUser.name?.match(reg) ||
            connectedUser.username?.match(reg) ||
            connectedUser.email.match(reg)
        )
        .sort(sortConnections)
    )
  }

  function handleTagTemplate(tagData) {
    let displayTitle: string = tagData.name || tagData.username || tagData.value
    const strLength = 30
    displayTitle =
      displayTitle.length > strLength
        ? (displayTitle = displayTitle.substring(0, strLength) + '...')
        : displayTitle

    const tagClass = tagData.hasAccepted
      ? 'tagify__tag_connection_accepted'
      : 'tagify__tag_connection_waiting'

    return `
        <tag title=${displayTitle}
                contenteditable='false'
                spellcheck='false'
                tabIndex='-1'
                class='tagify__tag coworker__tag ${tagClass}'
                ${this.getAttributes(tagData)}>
            <x title='' class='tagify__tag__removeBtn' role='button' aria-label='remove tag'></x>
            <div class='tagify__tag__wrapper'>
                ${getTagIcon(tagData.hasAccepted, overlappingConnections.includes(tagData.email))}
                <span class='tagify__tag-text'>${displayTitle}</span>
            </div>
        </tag>
    `
  }

  const deleteConnection = async (con: ConnectedUser) => {
    let response

    try {
      if (con.type === ConnectedUserType.Connection) {
        const { connection } = await ApiClient.Connections.getInvitedUser(con.email)
        response = await ApiClient.Connections.destroy(connection.id)
      } else {
        const { teamMember } = await ApiClient.TeamMembers.getTeamMember(con.email)
        response = await ApiClient.TeamMembers.destroy(teamMember.id)
      }
      reloadUserConnection()
      triggerNotification('', response.message, NotificationType.Success, 3000)
    } catch (error) {
      triggerNotification('', error.message, NotificationType.Error, 3000)
    }
  }

  const createConnection = async (con: ConnectedUser) => {
    let connection
    try {
      let response
      if (con.type === ConnectedUserType.Connection) {
        response = await ApiClient.Connections.create([con.email])
        connection = response.createdConnections[0]

        createTrace(traces.user__sent_invitation, user.id, {
          connection_id: connection.id,
          email: connection.invitedEmail,
          for: ConnectionType.connection,
          inviter_user_id: user.id,
          invite_method:
            bookingMode === BookingMode.QUICK_CREATE
              ? INVITE_METHODS.scheduler_connected_user_form
              : bookingMode === BookingMode.CREATE
              ? INVITE_METHODS.create_booking_page_connected_user_form
              : INVITE_METHODS.edit_booking_page_connected_user_form,
        })
      } else {
        response = await ApiClient.TeamMembers.invite({
          emails: [con.email],
          teamId: user.teamMembers[0].team.id,
        })
        connection = response.createdTeamMembers[0]

        createTrace(traces.user__sent_invitation, user.id, {
          connection_id: connection.id,
          email: connection.invitedEmail,
          for: ConnectionType.team,
          inviter_user_id: user.id,
          invite_method:
            bookingMode === BookingMode.QUICK_CREATE
              ? INVITE_METHODS.scheduler_connected_user_form
              : bookingMode === BookingMode.CREATE
              ? INVITE_METHODS.create_booking_page_connected_user_form
              : INVITE_METHODS.edit_booking_page_connected_user_form,
        })
      }
      setAvailableUsers((prevState) =>
        prevState.map((el) =>
          el.email === con.email && el.type === con.type
            ? {
                ...el,
                id: connection.id,
                name: connection?.invitedUser?.name,
                username: connection?.invitedUser?.username,
                imageUrl: connection?.invitedUser?.image,
                isInvited: true,
              }
            : el
        )
      )
      reloadUserConnection()
      triggerNotification('', response.message, NotificationType.Success, 3000)
    } catch (error) {
      triggerNotification('', error.message, NotificationType.Error, 3000)
    }
  }

  const createOrganizer = (email: string, isSuggestion?: boolean) => ({
    email,
    id: null,
    name: null,
    username: null,
    imageUrl: null,
    type: isSuggestion
      ? ConnectedUserType.Connection
      : (localStorage.getItem('currentSection') as ConnectedUserType),
    isSuggestion,
    isInvited: false,
    hasAccepted: false,
    isResended: false,
  })

  const inviteUser = (email: string, isSuggestion?: boolean) => {
    const data = createOrganizer(email, isSuggestion)

    if (availableUsers.find((el) => el.email === data.email && el.type === data.type)) return

    setOrganizersToDelete((prevState) =>
      prevState.filter((organizer) =>
        organizer.type === data.type ? organizer.email !== data.email : true
      )
    )

    setAvailableUsers((prevState) => [data, ...prevState])
    if (!isSuggestion)
      setOrganizers((prevState) =>
        !prevState.find((el) => el.email === data.email) ? [data, ...prevState] : prevState
      )

    bookingMode === BookingMode.QUICK_CREATE
      ? createConnection(data)
      : !isSuggestion &&
        triggerNotification(
          '',
          `${
            data.type === ConnectedUserType.Connection ? 'Connection' : 'Team member'
          } added locally and will be created after ${
            bookingMode === BookingMode.CREATE
              ? 'the creation of the booking page'
              : 'saving the booking page'
          }`,
          NotificationType.Success,
          3000
        )
  }

  useEffect(() => {
    updateTagsForOrganizers(organizers)
  }, [organizers])

  const updateTagsForOrganizers = (users: ConnectedUser[]) => {
    const existingTagEmails = tagsInput.current.value.map((tag: { email: string }) => tag.email)

    const organizerEmails = users.map((o) => o.email)
    const removedEmails = existingTagEmails.filter((email) => !organizerEmails.includes(email))
    const removedTags = tagsInput.current.value.filter((tag) => removedEmails.includes(tag.email))
    const addedTags = users
      .filter((organizer) => !existingTagEmails.includes(organizer.email))
      .map(mapUserConnectionToTag)

    tagsInput.current.addTags(addedTags)
    tagsInput.current.removeTags(removedTags.map((tag) => tag.value))
  }

  const mapUserConnectionToTag = (user: ConnectedUser) => ({
    name: user.name,
    username: user.username,
    email: user.email,
    value: user.email,
    hasAccepted: user.hasAccepted,
  })

  useEffect(() => {
    if (selectedType === BookingPageKind.shared && organizers.length === 0)
      tagsInput?.current?.removeAllTags()
  }, [selectedType])

  const [timeOutId, setTimeOutId] = useState(null)

  const onBlurHandler = () => {
    let id = setTimeout(() => {
      setIsOpen(false)
    })
    setTimeOutId(id)
  }

  const onFocusHandler = () => {
    clearTimeout(timeOutId)
    setIsOpen(true)
  }

  const [addedExistedTag, setAddedExistedTag] = useState<string>(null)

  useEffect(() => {
    const con = filteredUsers.find((el) => el.email === addedExistedTag)
    if (con)
      setOrganizers((prevState) =>
        prevState.some((el) => el.email === con.email) ? prevState : [...prevState, con]
      )
    else if (bookingMode === BookingMode.QUICK_CREATE && addedExistedTag !== null)
      setOrganizers((prevState) => [...prevState, createOrganizer(addedExistedTag)])
    else tagsInput.current.removeTags([addedExistedTag])
    setAddedExistedTag(null)
    setFilterInput('')
  }, [addedExistedTag])

  return (
    <div className='w-full mx-auto relative'>
      {bookingMode !== BookingMode.QUICK_CREATE && (
        <div className='mb-2 text-md'>
          <p className='my-1'>
            We'll check everyone's availabilities when showing free slots, and book time on
            everyone's selected calendars.
          </p>
          <p className='my-2 font-medium'>
            Connections will only be created if they are added as tags
          </p>
        </div>
      )}
      <div tabIndex={0} onFocus={onFocusHandler} onBlur={onBlurHandler}>
        <TagInput
          isLoading={isConnectionsLoading}
          onInput={setFilterInput}
          handleTagTemplate={handleTagTemplate}
          canEdit={canEdit}
          control={control}
          setOrganizers={setOrganizers}
          tagsInput={tagsInput}
          setAddedExistedTag={setAddedExistedTag}
        />
        <ConnectedUserDropdown
          availableUsers={filteredUsers}
          setOrganizersToDelete={setOrganizersToDelete}
          currentSection={currentSection}
          setCurrentSection={setCurrentSection}
          overlappingConnections={overlappingConnections}
          organizers={organizers}
          setOrganizers={setOrganizers}
          user={user}
          canEdit={canEdit}
          control={control}
          handleTagTemplate={handleTagTemplate}
          inviteUser={inviteUser}
          isLoading={isConnectionsLoading}
          setAvailableUsers={setAvailableUsers}
          triggerNotification={triggerNotification}
          onDelete={deleteConnection}
          bookingMode={bookingMode}
          isOpen={isOpen}
          setAddedExistedTag={setAddedExistedTag}
        />
      </div>
    </div>
  )
}

export const TagInput = ({
  isLoading,
  onInput,
  handleTagTemplate,
  control,
  setOrganizers,
  tagsInput,
  canEdit,
  setAddedExistedTag,
}: {
  isLoading: boolean
  onInput: (input: string) => void
  handleTagTemplate: (tagData: any) => string
  control: Control<any, object>
  setOrganizers: Dispatch<SetStateAction<ConnectedUser[]>>
  tagsInput: any
  canEdit: boolean
  setAddedExistedTag: (connectedUser: string) => void
}) => (
  <div className='w-full mb-4'>
    <Controller
      control={control}
      name='invitedCalendars'
      render={({ field: { onChange } }) => (
        <HoverTip
          content='You are not the owner of this shared booking page, so you cannot edit users'
          className='w-fit'
          xs
          placement='top'
          active={!canEdit}
        >
          <Tags
            tagifyRef={tagsInput}
            className={classNames(
              'overflow-hidden coworker__tags bg-[#F3F5F7] border-gray-300 px-4 py-4 rounded-md shadow-sm w-full border-none font-light',
              !canEdit && 'pointer-events-none opacity-70'
            )}
            name='invitedCalendars'
            loading={isLoading}
            settings={{
              duplicates: false,
              tagTextProp: 'email',
              addTagOnBlur: false,
              editTags: false,
              userInput: canEdit,
              delimiters: ' ',
              trim: false,
              autoComplete: {
                enabled: false,
              },
              dropdown: {
                enabled: false,
              },
              templates: {
                tag: handleTagTemplate,
              },
            }}
            placeholder='Name or email address'
            onInput={(e) => onInput(e.detail.value)}
            onRemove={(e) =>
              setOrganizers((prevState) =>
                prevState.filter((prev) => prev.email !== e.detail.data.email)
              )
            }
            onAdd={(e) => setAddedExistedTag(e.detail.data.email)}
          />
        </HoverTip>
      )}
    />
  </div>
)

const ConnectedUserDropdown = ({
  availableUsers,
  setOrganizersToDelete,
  currentSection,
  setCurrentSection,
  overlappingConnections,
  organizers,
  setOrganizers,
  user,
  handleTagTemplate,
  control,
  canEdit,
  inviteUser,
  isLoading,
  setAvailableUsers,
  triggerNotification,
  onDelete,
  bookingMode,
  isOpen,
  setAddedExistedTag,
}: IConnectedUserDropdownProps) => {
  const navigation = [
    {
      name: 'Connections',
      type: ConnectedUserType.Connection,
      current: currentSection === ConnectedUserType.Connection,
    },
    {
      name: 'Team',
      type: ConnectedUserType.Team,
      current: currentSection === ConnectedUserType.Team,
    },
  ]
  const canShowTeamSection = user.teamMembers.length > 0
  const sections = canShowTeamSection ? navigation : [navigation[0]]

  const resendInvitation = async (con: ConnectedUser) => {
    try {
      let response
      setAvailableUsers((prevState) =>
        prevState.map((el) =>
          el.email === con.email && el.type === con.type ? { ...el, isResended: true } : el
        )
      )
      if (con.type === ConnectedUserType.Connection)
        response = await ApiClient.Connections.create([con.email])
      else
        response = await ApiClient.TeamMembers.invite({
          emails: [con.email],
          teamId: user.teamMembers[0].team.id,
        })
      triggerNotification('', response.message, NotificationType.Success, 3000)
    } catch (error) {
      setAvailableUsers((prevState) =>
        prevState.map((el) =>
          el.email === con.email && el.type === con.type ? { ...el, isResended: false } : el
        )
      )
      triggerNotification('', error.message, NotificationType.Error, 3000)
    }
  }

  const updateOrganizersToDelete = (connectedUser: ConnectedUser) => {
    const condidtionText =
      bookingMode === BookingMode.CREATE
        ? 'the creation of the booking page'
        : 'saving the booking page'
    const connectionName =
      connectedUser.type === ConnectedUserType.Connection ? 'connection' : 'team member'
    setOrganizersToDelete((prevState) =>
      connectedUser.connectionId ? [...prevState, connectedUser] : prevState
    )
    triggerNotification(
      '',
      `${
        connectedUser.connectionId
          ? `The ${connectionName} will be deleted after ${condidtionText}`
          : `Local ${connectionName} deleted`
      }`,
      NotificationType.Success,
      3000
    )
  }

  if (!isOpen) return <></>

  return (
    <div className='shadow-md w-full'>
      <div className='flex space-x-8 border-b border-gray-75'>
        {sections.map((item) => (
          <div
            key={item.name}
            className={classNames('inline-flex items-center relative cursor-pointer')}
            onClick={() => {
              setCurrentSection(item.type)
              localStorage.setItem('currentSection', item.type)
            }}
          >
            <span
              className={classNames(
                item.current
                  ? 'border-black font-bold'
                  : 'border-transparent opacity-40 font-normal',
                'text-black text-sm flex items-center first:pl-4.5 pb-2 border-b'
              )}
            >
              {item.name}
              <div className='ml-2 flex justify-center font-bold text-sm rounded bg-gray-900 text-white w-5.5 h-5'>
                <span className='inline leading-tight'>
                  {availableUsers.filter((user) => user.type === item.type).length}
                </span>
              </div>
            </span>
          </div>
        ))}
      </div>
      <div>
        <SearchInput
          isLoading={isLoading}
          handleTagTemplate={handleTagTemplate}
          control={control}
          canEdit={canEdit}
          inviteUser={inviteUser}
        />
        <div className={classNames('max-h-[360px] overflow-y-scroll', style['showScrollbar'])}>
          {availableUsers
            .filter((connectedUser) =>
              currentSection === ConnectedUserType.Team
                ? connectedUser.type === ConnectedUserType.Team
                : connectedUser.type === ConnectedUserType.Connection
            )
            .map((connectedUser, index) => (
              <ConnectedUserListItem
                key={index}
                connectedUser={connectedUser}
                invite={() => resendInvitation(connectedUser)}
                onClick={() => setAddedExistedTag(connectedUser.email)}
                onDelete={() => {
                  setAvailableUsers((prevState) =>
                    prevState.filter(
                      (user) =>
                        user.email !== connectedUser.email || user.type !== connectedUser.type
                    )
                  )
                  bookingMode === BookingMode.QUICK_CREATE
                    ? onDelete(connectedUser)
                    : updateOrganizersToDelete(connectedUser)
                }}
                isActive={
                  !organizers.map((organizer) => organizer.email).includes(connectedUser.email)
                }
                isAvailable={overlappingConnections.includes(connectedUser.email)}
              />
            ))}
        </div>
        {user.credentials.length === 0 && availableUsers?.length > 0 && (
          <p className='mx-6'>
            We can't find the suggestions because you haven't connected the calendar
          </p>
        )}
      </div>
    </div>
  )
}

type SearchInputType = {
  isLoading: boolean
  handleTagTemplate: (tagData: any) => string
  control: Control<any, object>
  canEdit: boolean
  inviteUser: (email: string) => void
}

const SearchInput = ({ handleTagTemplate, control, canEdit, inviteUser }: SearchInputType) => {
  const tagsInput = useRef(null)
  const regex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

  return (
    <Controller
      control={control}
      name='invitedCalendars'
      render={({ field: { onChange } }) => (
        <Tags
          tagifyRef={tagsInput}
          className={classNames(
            'overflow-hidden coworker__tags px-4 py-4 rounded-md w-full font-light',
            !canEdit && 'pointer-events-none opacity-70'
          )}
          name='invitedCalendars'
          settings={{
            duplicates: false,
            tagTextProp: 'email',
            addTagOnBlur: false,
            editTags: false,
            delimiters: ' ',
            trim: false,
            userInput: canEdit,
            autoComplete: {
              enabled: false,
            },
            dropdown: {
              enabled: false,
            },
            templates: {
              tag: handleTagTemplate,
            },
            validate: (tagData) => (tagData.value.match(regex) ? true : false),
          }}
          onAdd={(e) => inviteUser(e.detail.data.email)}
          placeholder='type email to add new connection'
        />
      )}
    />
  )
}

export default ConnectedUserForm
