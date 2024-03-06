import Avatar from '@components/Avatar'
import { ClockIcon, SparklesIcon, ExclamationIcon } from '@heroicons/react/outline'
import { XIcon, RefreshIcon } from '@heroicons/react/solid'
import { CoworkerCategory } from 'lib/common/constants/coworkers'
import classNames from 'lib/common/utils/classNames'
import HoverTip from 'lib/ui/popups/HoverTip'
import ConnectedUser from 'modules/common/types/ConnectedUser'

const ConnectedUserListItem = ({
  connectedUser,
  onClick,
  onDelete,
  isActive,
  isAvailable,
  invite,
}: {
  connectedUser: ConnectedUser
  onClick: (e) => void
  onDelete: (connectedUser: ConnectedUser) => void
  isActive: boolean
  isAvailable: boolean
  invite: () => Promise<void>
}) => {
  const label = connectedUser.email || connectedUser.name
  const subLabel = connectedUser.isInvited && connectedUser.username && connectedUser.username

  return (
    <li className='relative flex justify-between text-sm font-semibold'>
      <div
        data-category={CoworkerCategory.BookingPageConnections}
        onClick={(e) => (isActive ? onClick(e) : null)}
        className={classNames(
          'flex items-center justify-between w-full hover:bg-gray-50 py-1.5 px-4 rounded-md cursor-pointer',
          !isActive && 'opacity-40'
        )}
      >
        <div className='flex items-center justify-start w-1/2'>
          <Avatar
            image={connectedUser.imageUrl}
            name={connectedUser.name || connectedUser.username || connectedUser.email}
            className='w-6 h-6 rounded-full mr-3 flex-shrink-0'
            empty={!connectedUser.isInvited}
          />
          <div className='flex flex-col justify-center items-start w-full'>
            <span className='font-semibold max-w-full truncate ...'>{label}</span>
            <span className='font-normal text-gray-200 max-w-full truncate ...'>{subLabel}</span>
          </div>
        </div>
        <div className='flex items-center justify-end'>
          {connectedUser.hasAccepted && !isAvailable && (
            <ExclamationIcon className='block w-5 h-5 mr-3 fill-yellow-500 text-white' />
          )}
          {!connectedUser.hasAccepted && !connectedUser.isSuggestion && (
            <ClockIcon className='block w-4.5 h-4.5 mr-9 fill-yellow-500 text-white' />
          )}
          {connectedUser.isSuggestion ? (
            <SparklesIcon rotate={60} width={16} />
          ) : (
            <HoverTip
              className='hidden sm:block'
              xs
              content={connectedUser.hasAccepted ? 'Delete connection' : 'Cancel invitation'}
            >
              <XIcon
                id={connectedUser.email}
                onClick={(e) => {
                  isActive ? onDelete(connectedUser) : null
                  e.stopPropagation()
                }}
                className='w-4 h-4 cursor-pointer'
              />
            </HoverTip>
          )}
        </div>
      </div>
      {!connectedUser.hasAccepted && !connectedUser.isSuggestion && connectedUser.isInvited && (
        <div className='absolute right-9'>
          <HoverTip className='hidden sm:block' xs content='Resend invitation'>
            <RefreshIcon
              onClick={(e) => (!connectedUser.isResended ? invite() : null)}
              data-email={connectedUser.email}
              className={classNames(
                'mt-3 mr-2 w-4 h-4 cursor-pointer',
                connectedUser.isResended && 'opacity-40'
              )}
              width={12}
            />
          </HoverTip>
        </div>
      )}
    </li>
  )
}

export default ConnectedUserListItem
