import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom'
import { Popover } from '@headlessui/react'
import { XIcon } from '@heroicons/react/outline'
import classNames from 'lib/common/utils/classNames'
import { Dispatch, SetStateAction, useEffect, useRef } from 'react'
import { ModalSizeType } from './SchedulerTutorialModal'

interface ComponentProps {
  stepsCount: number
  header: string
  text: string
  ctaText: string
  onCta: () => void
  onClose: () => void
  className: string
  currentStep: number
  setModalSize: Dispatch<SetStateAction<ModalSizeType>>
}

const SchedulerTutorialPopover = ({
  stepsCount,
  header,
  text,
  ctaText,
  onCta,
  onClose,
  className,
  currentStep,
  setModalSize,
}: ComponentProps) => {
  const { x, y, reference, floating, strategy, update, refs, placement } = useFloating({
    placement: 'left',
    middleware: [offset(1), shift({ padding: 1 }), flip()],
  })

  useEffect(() => {
    setModalSize({
      width: refs.floating.current.getBoundingClientRect().width,
      height: refs.floating.current.getBoundingClientRect().height,
    })
  }, [currentStep])

  useEffect(() => {
    if (!refs.reference.current || !refs.floating.current) {
      return
    }

    // Only call this when the floating element is rendered
    return autoUpdate(refs.reference.current, refs.floating.current, update)
  }, [refs.reference, refs.floating, update])

  return (
    <Popover>
      <Popover.Panel
        static
        className={classNames('w-80', className)}
        ref={floating}
        style={{
          position: strategy,
          top: y ?? '',
          left: x ?? '',
        }}
      >
        <XIcon className='absolute right-4 top-4 cursor-pointer w-5 h-5' onClick={onClose} />
        <div className='flex flex-col font-manrope -mx-2'>
          <div className='text-left'>
            <h3 className='text-lg font-bold -mt-3.5'>{header}</h3>
            <div className='mt-1'>
              <div className='text-sm leading-5 font-normal whitespace-pre-line font-sans'>
                {text}
              </div>
            </div>
          </div>
          <div className='flex justify-end items-center mt-4.5 -mb-2.5'>
            <div className='mr-4.5 text-xs font-normal'>
              {currentStep} of {stepsCount}
            </div>
            <div onClick={stepsCount === currentStep ? onClose : onCta} className='btn btn-flash'>
              {ctaText}
            </div>
          </div>
        </div>
      </Popover.Panel>
    </Popover>
  )
}

export default SchedulerTutorialPopover
