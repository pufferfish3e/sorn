---
name: animated-counters
description: Implement animated numeric counters using NumberFlow and Motion for React. Use this skill when the user needs count-up statistics, KPI displays, dashboard metrics, portfolio highlights, scroll-triggered counters, or animated numeric transitions that feel smooth and production-grade.
license: Complete terms in LICENSE.txt
---

This skill implements animated numeric transitions using NumberFlow combined with Motion viewport triggers and layout animation patterns.

NumberFlow handles digit animation.

Motion handles visibility timing and interaction choreography.

Avoid incorrect approaches like interval timers, manual frame loops, or GSAP-based numeric tweening.


CORE CONCEPT

NumberFlow animates automatically when its value prop changes.

Example:

value: 0 → 12580

Triggers animation immediately.

There is no built-in:

animateOnMount
animateWhenVisible

These must be implemented using state transitions.

Correct architecture:

state change → NumberFlow animation
visibility trigger → Motion
layout transition → Motion
digit animation → NumberFlow


WHEN TO USE THIS SKILL

Use whenever building:

- portfolio stat counters
- KPI metrics
- dashboard analytics numbers
- GitHub stars display
- years of experience counters
- projects completed counters
- technologies mastered counters
- scroll-triggered stat sections
- landing page hero metrics

Do NOT use for:

- timestamps
- IDs
- navigation labels
- static numeric text


STANDARD COUNTER BEHAVIOR TYPES


PAGE-LOAD COUNTER

Appears immediately visible.

Implementation:

initial value = 0
after mount = target value

Triggers NumberFlow animation automatically.


VIEWPORT-TRIGGERED COUNTER (PREFERRED)

Appears later in scroll flow.

Implementation:

initial value = 0
onViewportEnter → set target value

Triggers animation once.


REQUIRED LIBRARIES

Primary:

@number-flow/react
motion/react

Optional:

react-intersection-observer

Motion viewport triggers are preferred over manual observers.


REQUIRED NUMBERFLOW PROPS

Always include:

plugins={[continuous]}
trend={1}

Reason:

continuous → smooth rolling transitions
trend={1} → always counts upward

Optional formatting:

locales="en-US"

Optional compact formatting:

format={{
notation: "compact",
compactDisplay: "short"
}}

Example:

12500 → 12.5K


PAGE-LOAD COUNTER IMPLEMENTATION PATTERN

"use client";

import { useEffect, useState } from "react";
import NumberFlow, { continuous } from "@number-flow/react";

export default function Counter() {

  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(12580);
  }, []);

  return (
    <NumberFlow
      value={value}
      plugins={[continuous]}
      trend={1}
      locales="en-US"
    />
  );

}


VIEWPORT COUNTER IMPLEMENTATION PATTERN

"use client";

import { useState } from "react";
import { motion } from "motion/react";
import NumberFlow, { continuous } from "@number-flow/react";

export default function InViewCounter() {

  const [value, setValue] = useState(0);

  return (
    <motion.div
      viewport={{ once: true, amount: 0.5 }}
      onViewportEnter={() => setValue(12580)}
    >
      <NumberFlow
        value={value}
        plugins={[continuous]}
        trend={1}
      />
    </motion.div>
  );

}


MOTION REVEAL PATTERN

<motion.div
initial={{ opacity: 0, y: 10 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
>

Creates:

- fade-in
- slide-in
- count-up animation


LAYOUT ANIMATION COMPATIBILITY

NumberFlow supports Motion layout animations.

Preferred wrapper:

<motion.div layout>


Recommended transition:

transition={{
type: "spring",
duration: 0.9,
bounce: 0
}}


REUSABLE COMPONENT PATTERN

AnimatedNumber.tsx


"use client";

import { useState } from "react";
import { motion } from "motion/react";
import NumberFlow, { continuous } from "@number-flow/react";

type Props = {
value: number;
};

export default function AnimatedNumber({ value }: Props) {

  const [visibleValue, setVisibleValue] = useState(0);

  return (
    <motion.div
      viewport={{ once: true }}
      onViewportEnter={() => setVisibleValue(value)}
    >
      <NumberFlow
        value={visibleValue}
        plugins={[continuous]}
        trend={1}
      />
    </motion.div>
  );

}


ACCESSIBILITY REQUIREMENTS

Respect reduced-motion preferences automatically.

NumberFlow disables animation when:

prefers-reduced-motion: reduce

Do NOT override this behavior.


PERFORMANCE RULES

Correct:

update value once
trigger animation once
use viewport once:true


Incorrect:

setInterval loops
requestAnimationFrame loops
GSAP numeric tweening
frame-by-frame state updates


ANTI-PATTERNS

Do NOT implement:

setInterval counting
GSAP number tweening
manual digit animation
increment loops
rendering final value immediately


Correct implementation:

render 0 first
update state once
let NumberFlow animate


PORTFOLIO USAGE RECOMMENDATIONS

Ideal counters:

Projects Completed
Technologies Used
Deployments
GitHub Stars
Years Experience
Users Served
Features Built


SUMMARY

NumberFlow animates digits.

Motion controls timing triggers.

Correct architecture:

initial state = 0
visibility trigger OR mount trigger
state update → NumberFlow animation

Never implement manual numeric animation logic.