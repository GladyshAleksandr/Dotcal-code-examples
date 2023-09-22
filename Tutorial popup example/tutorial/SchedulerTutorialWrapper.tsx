import { Transition } from '@headlessui/react'
import { XIcon } from '@heroicons/react/outline'
import AnimatedFlipDiv from 'lib/ui/transitions/AnimatedFlipDiv'
import { TransitionProvider } from 'lib/ui/transitions/TransitionContext'
import { Dispatch, SetStateAction, useEffect, useRef } from 'react'
import { ArrowPlacement, ElementSide, ModalSizeType, StepType } from './SchedulerTutorialModal'

interface ComponentProps {
  steps: StepType[]
  currentStep: number
  isOpen: boolean
  children: JSX.Element
  onLeave: boolean
  setOnLeave: Dispatch<SetStateAction<boolean>>
  onClose: () => void
  setCurrentStep: Dispatch<SetStateAction<number>>
  modalSize: ModalSizeType
  selectFounderGroup: () => void
}

export interface Coords {
  x: number
  y: number
}

const SchedulerTutorialWrapper = ({
  steps,
  currentStep,
  isOpen,
  children,
  onLeave,
  setOnLeave,
  onClose,
  setCurrentStep,
  modalSize,
  selectFounderGroup,
}: ComponentProps) => {
  let validArrowPlacement: ArrowPlacement
  const arrowHeight = 24
  const arrowWidth = 24
  const padding = arrowHeight * 2
  const navbarMarginHeight = 80
  const wrapperWidth = modalSize.width + padding
  const wrapperHeight = modalSize.height + padding
  const currentStepObj = steps.find((step) => step.step === currentStep)
  const previousStepObj = steps.find((step) => step.step === currentStep - 1) || {
    ...currentStepObj,
  }

  const getWrapperPointsTo = (currentStep: StepType): Coords => {
    switch (currentStep.arrowPointsToElementSide) {
      case ElementSide.left:
        return {
          x: currentStep.elementDomRect.left,
          y:
            currentStep.elementDomRect.top -
            navbarMarginHeight +
            currentStep.elementDomRect.height / 2,
        }
      case ElementSide.right:
        return {
          x: currentStep.elementDomRect.left + currentStep.elementDomRect.width,
          y:
            currentStep.elementDomRect.top -
            navbarMarginHeight +
            currentStep.elementDomRect.height / 2,
        }
      case ElementSide.top:
        return {
          x: currentStep.elementDomRect.left + currentStep.elementDomRect.width / 2,
          y: currentStep.elementDomRect.top - navbarMarginHeight,
        }
      case ElementSide.bottom:
        return {
          x: currentStep.elementDomRect.left + currentStep.elementDomRect.width / 2,
          y:
            currentStep.elementDomRect.top - navbarMarginHeight + currentStep.elementDomRect.height,
        }
      case ElementSide.middle:
        return {
          x: currentStep.elementDomRect.left + currentStep.elementDomRect.width / 2,
          y:
            currentStep.elementDomRect.top -
            navbarMarginHeight +
            currentStep.elementDomRect.height / 2,
        }
    }
  }

  const getWrapperPosition = (arrowPlacement: ArrowPlacement, wrapperPointsTo: Coords): Coords => {
    const padding = arrowHeight * 3

    switch (arrowPlacement) {
      case ArrowPlacement.topLeft:
        return { x: wrapperPointsTo.x - padding, y: wrapperPointsTo.y }
      case ArrowPlacement.topRight:
        return {
          x: wrapperPointsTo.x - wrapperWidth + padding,
          y: wrapperPointsTo.y,
        }
      case ArrowPlacement.rightTop:
        return {
          x: wrapperPointsTo.x - wrapperWidth,
          y: wrapperPointsTo.y - padding,
        }
      case ArrowPlacement.rightBottom:
        return {
          x: wrapperPointsTo.x - wrapperWidth,
          y: wrapperPointsTo.y - wrapperHeight + padding,
        }
      case ArrowPlacement.bottomRight:
        return {
          x: wrapperPointsTo.x - wrapperWidth + padding,
          y: wrapperPointsTo.y - wrapperHeight,
        }
      case ArrowPlacement.bottomLeft:
        return {
          x: wrapperPointsTo.x - padding,
          y: wrapperPointsTo.y - wrapperHeight,
        }
      case ArrowPlacement.leftBottom:
        return {
          x: wrapperPointsTo.x,
          y: wrapperPointsTo.y - wrapperHeight + padding,
        }
      case ArrowPlacement.leftTop:
        return { x: wrapperPointsTo.x, y: wrapperPointsTo.y - padding }
    }
  }

  const getValidArrowPlacement = (coords: Coords): ArrowPlacement => {
    if (!coords.x && !coords.y) return currentStepObj.arrowPlacement

    const xCenter = window.innerWidth / 2
    const yCenter = window.innerHeight / 2

    if (coords.y < 0)
      return currentStepObj.elementDomRect.left < xCenter
        ? ArrowPlacement.topLeft
        : ArrowPlacement.topRight

    if (coords.y + modalSize.height > window.innerHeight)
      return currentStepObj.elementDomRect.left < xCenter
        ? ArrowPlacement.bottomLeft
        : ArrowPlacement.bottomRight

    if (coords.x < 0)
      return currentStepObj.elementDomRect.top < yCenter
        ? ArrowPlacement.leftTop
        : ArrowPlacement.leftBottom

    if (coords.x + +modalSize.width > window.innerWidth)
      return currentStepObj.elementDomRect.top < yCenter
        ? ArrowPlacement.rightTop
        : ArrowPlacement.rightBottom

    return currentStepObj.arrowPlacement
  }

  const getPosition = (currentStep: StepType): Coords => {
    if (!currentStep.elementDomRect) return { x: 0, y: 0 }
    const wrapperPointsTo = getWrapperPointsTo(currentStep)
    const resultToCompare = getWrapperPosition(currentStep.arrowPlacement, wrapperPointsTo)
    validArrowPlacement = getValidArrowPlacement(resultToCompare)
    return getWrapperPosition(validArrowPlacement, wrapperPointsTo)
  }

  useEffect(() => {
    let scrollTimeout
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(function () {
        setCurrentStep((prevState) => ++prevState)
      }, 100)
      if (currentStep === 1) {
        selectFounderGroup()
      }
    }
    const el = document.getElementById('sidebarItem')
    el.addEventListener('scroll', handleScroll)

    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <TransitionProvider>
      <AnimatedFlipDiv
        key={currentStep}
        className='flex justify-start'
        set={{ opacity: 1, x: getPosition(currentStepObj).x, y: getPosition(currentStepObj).y }}
        from={{
          opacity: 1,
          x: getPosition(previousStepObj).x,
          y: getPosition(previousStepObj).y,
        }}
        to={{
          opacity: 1,
          x: getPosition(currentStepObj).x,
          y: getPosition(currentStepObj).y,
          duration: 0.15,
        }}
        skipOutro={currentStep === 1 || !isOpen}
        skipLayout
        useBouncedEnter
        onLeave={onLeave}
        isOnLeavePlayed={() => {
          onClose()
          setTimeout(() => {
            setOnLeave(false)
            setCurrentStep(1)
          }, 300)
        }}
        currentStep={currentStep}
      >
        <div
          className='flex items-start justify-start text-center relative'
          style={{
            width: wrapperWidth,
            height: wrapperHeight,
            paddingLeft: arrowHeight,
            paddingTop: arrowHeight,
          }}
        >
          <Arrow
            arrowPlacement={validArrowPlacement}
            arrowHeight={arrowHeight}
            arrowWidth={arrowWidth}
          />
          {children}
        </div>
      </AnimatedFlipDiv>
    </TransitionProvider>
  )
}

type ArrowProps = {
  arrowPlacement: ArrowPlacement
  arrowHeight: number
  arrowWidth: number
}
const Arrow = ({ arrowPlacement, arrowHeight, arrowWidth }: ArrowProps) => {
  const arrowPadding = arrowHeight * 2
  const getArrowPos = (arrowPadding: number, fromEnd: number) => {
    switch (arrowPlacement) {
      case ArrowPlacement.topLeft:
        return { left: arrowPadding, top: fromEnd }
      case ArrowPlacement.topRight:
        return { right: arrowPadding, top: fromEnd }
      case ArrowPlacement.rightTop:
        return { right: fromEnd, top: arrowPadding }
      case ArrowPlacement.rightBottom:
        return { bottom: arrowPadding, right: fromEnd }
      case ArrowPlacement.bottomRight:
        return { bottom: fromEnd, right: arrowPadding }
      case ArrowPlacement.bottomLeft:
        return { left: arrowPadding, bottom: fromEnd }
      case ArrowPlacement.leftBottom:
        return { left: fromEnd, bottom: arrowPadding }
      case ArrowPlacement.leftTop:
        return { left: fromEnd, top: arrowPadding }
    }
  }

  const getArrowStyle = (width: number, height: number, color: string) => {
    const xBorder = `${width}px solid transparent`
    const border = `${height}px solid ${color}`

    const arrowStyle =
      arrowPlacement === ArrowPlacement.topLeft || arrowPlacement === ArrowPlacement.topRight
        ? {
            borderLeft: xBorder,
            borderRight: xBorder,
            borderBottom: border,
          }
        : arrowPlacement === ArrowPlacement.rightTop ||
          arrowPlacement === ArrowPlacement.rightBottom
        ? {
            borderTop: xBorder,
            borderBottom: xBorder,
            borderLeft: border,
          }
        : arrowPlacement === ArrowPlacement.bottomRight ||
          arrowPlacement === ArrowPlacement.bottomLeft
        ? {
            borderLeft: xBorder,
            borderRight: xBorder,
            borderTop: border,
          }
        : {
            borderTop: xBorder,
            borderBottom: xBorder,
            borderRight: border,
          }
    return arrowStyle
  }
  const subArrowDiff = 5
  const arrowPaddingFromEnd = 3
  const subArrowWidth = arrowWidth - subArrowDiff
  const subArrowHeiight = arrowHeight - subArrowDiff
  const subArrowPadding = arrowPadding + subArrowDiff
  const subArrowPaddingFromEnd = arrowPaddingFromEnd + subArrowDiff + 1

  return (
    <>
      <div
        className='w-0 h-0 absolute z-0'
        style={{
          ...getArrowStyle(arrowWidth, arrowHeight, '#FA8B26'),
          ...getArrowPos(arrowPadding, arrowPaddingFromEnd),
        }}
      ></div>
      <div
        className='w-0 h-0 absolute z-50'
        style={{
          ...getArrowStyle(subArrowWidth, subArrowHeiight, 'white'),
          ...getArrowPos(subArrowPadding, subArrowPaddingFromEnd),
        }}
      ></div>
    </>
  )
}

export default SchedulerTutorialWrapper
