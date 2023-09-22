import { Transition } from '@headlessui/react'
import classNames from 'lib/common/utils/classNames'
import { MutableRefObject, useEffect, useState } from 'react'
import { number } from 'yup'
import SchedulerTutorialPopover from './SchedulerTutorialPopover'
import SchedulerTutorialWrapper, { Coords } from './SchedulerTutorialWrapper'

interface ComponentProps {
  isOpen: boolean
  onClose: () => void
  stepsRefs: Array<MutableRefObject<HTMLDivElement>>
  selectFounderGroup: () => void
}

export type StepType = {
  step: number
  elementDomRect: DOMRect
  header: string
  text: string
  placement: string
  arrowPlacement: ArrowPlacement
  arrowPointsToElementSide: ElementSide
}

export enum ElementSide {
  left,
  right,
  bottom,
  top,
  middle,
}

export enum ArrowPlacement {
  topLeft,
  topRight,
  rightTop,
  rightBottom,
  bottomRight,
  bottomLeft,
  leftBottom,
  leftTop,
}

export type ModalSizeType = {
  width: number
  height: number
}

const SchedulerTutorialModal = ({
  isOpen,
  onClose,
  stepsRefs,
  selectFounderGroup,
}: ComponentProps) => {
  const steps: StepType[] = [
    {
      step: 1,
      elementDomRect: stepsRefs[0]?.current?.getBoundingClientRect(),
      header: 'Welcome to your Dotcal',
      text: 'From here you can see your availability and instantly schedule meetings. ',
      placement: 'right',
      arrowPlacement: ArrowPlacement.topLeft,
      arrowPointsToElementSide: ElementSide.bottom,
    },
    {
      step: 2,
      elementDomRect: stepsRefs[1]?.current?.getBoundingClientRect(),
      header: 'See it in action',
      text: 'When you click a connection or group, you will see when you’re all available.',
      placement: 'right',
      arrowPlacement: ArrowPlacement.leftTop,
      arrowPointsToElementSide: ElementSide.right,
    },
    {
      step: 3,
      elementDomRect: stepsRefs[2]?.current?.getBoundingClientRect(),
      header: 'This is your scheduler',
      text: 'You can click on the a time that everyone is free to insantly schedule a meeting.',
      placement: 'left',
      arrowPlacement: ArrowPlacement.rightTop,
      arrowPointsToElementSide: ElementSide.middle,
    },
    {
      step: 4,
      elementDomRect: stepsRefs[3]?.current?.getBoundingClientRect(),
      header: 'See who’s here',
      text: `See connection status of everyone and diagnose any availability issues.`,
      placement: 'bottom',
      arrowPlacement: ArrowPlacement.topRight,
      arrowPointsToElementSide: ElementSide.bottom,
    },
    {
      step: 5,
      elementDomRect: stepsRefs[4]?.current?.getBoundingClientRect(), //! if user has a lot of connections the modal fly out
      header: 'Add your first connection',
      text: 'Share your connection link or send a direct invite to start scheduling today. ',
      placement: 'right',
      arrowPlacement: ArrowPlacement.leftTop,
      arrowPointsToElementSide: ElementSide.right,
    },
  ]

  const [currentStep, setCurrentStep] = useState(1)
  const [onLeave, setOnLeave] = useState(false)
  const [modalSize, setModalSize] = useState<ModalSizeType>({ width: 0, height: 0 })

  const getCurrentStepObj = () => steps.find((step) => step.step === currentStep)
  const getNextStepObj = () => steps.find((step) => step.step === currentStep + 1)

  function isNextElementOutOfView(elementDomRect: DOMRect) {
    if (!elementDomRect) return false
    return (
      elementDomRect.top < 0 ||
      elementDomRect.top > window.innerHeight ||
      elementDomRect.left < 0 ||
      elementDomRect.left > window.innerWidth
    )
  }

  const onCta = () => {
    if (isNextElementOutOfView(getNextStepObj().elementDomRect)) scrollSideBar()
    else setCurrentStep((prevState) => ++prevState)
    if (currentStep === 1) {
      selectFounderGroup()
    }
  }

  const scrollSideBar = () => {
    stepsRefs[currentStep].current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  return (
    <Transition
      show={isOpen}
      as='div'
      className={'relative bg-[#ffffff4f] h-full w-full z-50 inset-0'}
      enter='transition duration-200 ease-out'
      enterFrom='opacity-0'
      enterTo='opacity-100'
      leave='transition duration-100 ease-in'
      leaveFrom='opacity-100'
      leaveTo='opacity-0'
    >
      <SchedulerTutorialWrapper
        isOpen={isOpen}
        steps={steps}
        currentStep={currentStep}
        onLeave={onLeave}
        setOnLeave={setOnLeave}
        onClose={onClose}
        setCurrentStep={setCurrentStep}
        modalSize={modalSize}
        selectFounderGroup={selectFounderGroup}
      >
        <SchedulerTutorialPopover
          className={classNames(`relative inline-block align-bottom bg-white rounded-xl
          text-left overflow-hidden shadow transform transition-all anim-border z-30`)}
          stepsCount={steps.length}
          text={getCurrentStepObj().text}
          ctaText={currentStep === steps.length ? 'Finish' : 'Next'}
          onCta={onCta}
          onClose={() => {
            setOnLeave(true)
          }}
          header={getCurrentStepObj().header}
          currentStep={currentStep}
          setModalSize={setModalSize}
        />
      </SchedulerTutorialWrapper>
    </Transition>
  )
}

export default SchedulerTutorialModal
