package com.musicqueue

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import kotlinx.serialization.Serializable
import org.slf4j.LoggerFactory

private val logger = LoggerFactory.getLogger("StatusPages")

fun Application.configureStatusPages() {
    install(StatusPages) {
        exception<IllegalArgumentException> { call, cause ->
            call.respond(HttpStatusCode.BadRequest, ErrorResponse(cause.message ?: "Invalid request."))
        }
        exception<QobuzServiceException> { call, cause ->
            logger.warn("Qobuz search failed", cause)
            call.respond(
                HttpStatusCode.BadGateway,
                ErrorResponse("Qobuz request failed: ${cause.message ?: "unknown error"}")
            )
        }
        exception<Throwable> { call, cause ->
            logger.error("Unhandled server error", cause)
            call.respond(HttpStatusCode.InternalServerError, ErrorResponse("Unexpected server error."))
        }
    }
}

@Serializable
data class ErrorResponse(val error: String)



